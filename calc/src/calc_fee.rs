use crate::debug;
use core::str::FromStr;
use log::info;
use serde_derive::Deserialize;
use sp_arithmetic::{FixedI128, FixedPointNumber, FixedU128, Perbill};
use sp_arithmetic_legacy::Fixed128 as Fixed128Legacy;
use wasm_bindgen::prelude::*;

type Balance = u128;
type Weight = u64;

#[derive(Deserialize)]
#[allow(non_snake_case)]
pub struct JSCoefficient {
    coeffInteger: String,
    coeffFrac: u32,
    negative: bool,
    degree: u8,
}

#[derive(Debug)]
struct Coefficient {
    coeff_integer: Balance,
    coeff_frac: Perbill,
    negative: bool,
    degree: u8,
}

#[derive(Debug)]
enum Multiplier {
    V0(Fixed128Legacy),
    V1((FixedI128, bool)),
    V2(FixedU128),
}

impl Multiplier {
    fn new(inner: &str, spec_name: &str, spec_version: u32) -> Option<Self> {
        use Multiplier::{V0, V1, V2};
        let mult = match (spec_name, spec_version) {
            ("polkadot", 0) => V1((new_i128(inner), true)),
            ("polkadot", v) if v < 11 => V1((new_i128(inner), false)),
            ("polkadot", v) if 11 <= v => V2(new_u128(inner)),

            ("kusama", 1062) => V0(new_legacy_128(inner)),
            ("kusama", v) if 1062 < v && v < 2011 => V1((new_i128(inner), false)),
            ("kusama", v) if 2011 <= v => V2(new_u128(inner)),

            ("westend", 10) => V0(new_legacy_128(inner)),
            ("westend", v) if 10 < v && v < 31 => V1((new_i128(inner), false)),
            ("westend", v) if 31 <= v => V2(new_u128(inner)),

            ("statemine", _v) => V2(new_u128(inner)),
            ("statemint", _v) => V2(new_u128(inner)),

            ("westmine", _v) => V2(new_u128(inner)),
            ("westmint", _v) => V2(new_u128(inner)),

            ("dock-main-runtime", _) => V2(new_u128(inner)),
            ("dock-pos-main-runtime", _) => V2(new_u128(inner)),
            ("dock-pos-test-runtime", _) => V2(new_u128(inner)),

            _ => {
                info!("Unsupported runtime: {}#{}", spec_name, spec_version);
                return None;
            }
        };
        Some(mult)
    }

    fn calc(&self, balance: Balance) -> Balance {
        match self {
            Self::V0(mult) => mult.saturated_multiply_accumulate(balance),
            Self::V1((mult, negative_bug)) => {
                if *negative_bug && mult.is_negative() {
                    // replicate the fixed128 bug where negative coefficients are not considered
                    balance
                } else {
                    mult.saturating_mul_acc_int(balance)
                }
            }
            // V2 changed the range to [0, inf]: we no longer accumulate (only multiply)
            Self::V2(mult) => mult.saturating_mul_int(balance),
        }
    }
}

#[wasm_bindgen]
#[derive(Debug)]
pub struct CalcFee {
    polynomial: Vec<Coefficient>,
    multiplier: Multiplier,
    per_byte_fee: Balance,
    adjust_len_fee: bool,
}

#[wasm_bindgen]
impl CalcFee {
    pub fn from_params(
        polynomial: &JsValue,
        multiplier: &str,
        per_byte_fee: &str,
        spec_name: &str,
        spec_version: u32,
    ) -> Option<CalcFee> {
        debug::setup();
        info!(
            "CalcFee::from_params({:#?}, {}, {}, {}, {})",
            polynomial, multiplier, per_byte_fee, spec_name, spec_version
        );

        let polynomial: Vec<Coefficient> = {
            let poly: Option<Vec<JSCoefficient>> = polynomial.into_serde().unwrap();
            poly.map(|vec| {
                vec.iter()
                    .map(|c| Coefficient {
                        coeff_integer: Balance::from_str(&c.coeffInteger).unwrap(),
                        coeff_frac: Perbill::from_parts(c.coeffFrac),
                        negative: c.negative,
                        degree: c.degree,
                    })
                    .collect()
            })
            .unwrap_or_else(|| {
                vec![Coefficient {
                    coeff_integer: 8,
                    coeff_frac: Perbill::from_parts(0),
                    negative: false,
                    degree: 1,
                }]
            })
        };
        let multiplier = Multiplier::new(multiplier, spec_name, spec_version)?;
        let per_byte_fee = Balance::from_str(per_byte_fee).unwrap();
        let adjust_len_fee = if let Multiplier::V2(_) = &multiplier {
            false
        } else {
            true
        };
        let calc = Self {
            polynomial,
            multiplier,
            per_byte_fee,
            adjust_len_fee,
        };
        info!(
            "CalcFee::withParams({}, {}) -> {:#?}",
            spec_name, spec_version, calc
        );
        Some(calc)
    }

    pub fn calc_fee(
        &self, 
        weight: Weight, 
        len: u32, 
        extrinsic_base_weight: Weight,
    ) -> String {
        let unadjusted_len_fee = self.per_byte_fee.saturating_mul(len.into());
        let unadjusted_weight_fee = weight_to_fee(&weight, &self.polynomial);
        let base_fee = weight_to_fee(&extrinsic_base_weight, &self.polynomial);

        let (len_fee, adjustable_fee) = if self.adjust_len_fee {
            (0, unadjusted_len_fee.saturating_add(unadjusted_weight_fee))
        } else {
            (unadjusted_len_fee, unadjusted_weight_fee)
        };
        let adjusted_fee = self.multiplier.calc(adjustable_fee);

        let result = base_fee
            .saturating_add(len_fee)
            .saturating_add(adjusted_fee);

        info!(
            "calc_fee: ({}, {}) -> len_fee: {} weight_fee: {} adjustable_fee: {} \
			adjusted_fee: {} base_fee: {} result: {}",
            weight,
            len,
            unadjusted_len_fee,
            unadjusted_weight_fee,
            adjustable_fee,
            adjusted_fee,
            base_fee,
            result
        );

        result.to_string()
    }
}

fn weight_to_fee(weight: &Weight, polynomial: &[Coefficient]) -> Balance {
    polynomial.iter().fold(0, |mut acc: Balance, args| {
        let weight: Balance = weight.saturating_pow(args.degree.into()).into();

        let frac = args.coeff_frac * weight;
        let integer = args.coeff_integer.saturating_mul(weight);

        if args.negative {
            acc = acc.saturating_sub(frac);
            acc = acc.saturating_sub(integer);
        } else {
            acc = acc.saturating_add(frac);
            acc = acc.saturating_add(integer);
        }

        acc
    })
}

fn new_i128(inner: &str) -> FixedI128 {
    FixedI128::from_inner(i128::from_str(inner).unwrap())
}

fn new_u128(inner: &str) -> FixedU128 {
    FixedU128::from_inner(u128::from_str(inner).unwrap())
}

fn new_legacy_128(inner: &str) -> Fixed128Legacy {
    Fixed128Legacy::from_parts(i128::from_str(inner).unwrap())
}
