<h1 style="text-align: center">WinnersData</h1>

## Summary

In this guide we will learn how to track auction winners using [substrate-api-sidecar](https://github.com/paritytech/substrate-api-sidecar).


## Key values to track and store

To find the winner of a completed auction we will need to know the block number the auction ended at. Since Sidecar is a stateless API and auction info is wiped once it is over we need the block number to make historic queries to a state when the relevant data was stored (keep reading for details).

This can be done by leveraging the `/experimental/paras/auctions/current` endpoint. 

When there is an ongoing auction the return object will look like following below:

```
{
  "at": {
    "hash": "string",
    "height": "string"
  },
  "beginEnd": "string",
  "finishEnd": "string",
  "phase": "opening",
  "auctionIndex": "string",
  "leasePeriods": [
    "string"
  ],
  "winning": [
    {
      "bid": {
        "accountId": "string",
        "paraId": "string",
        "amount": "string"
      },
      "leaseSet": [
        "string"
      ]
    }
  ]
}
```

We will track and store `finishEnd`,`auctionIndex`, and `leasePeriods` in a Database. 

** Details of each key **

`finishEnd`: This is the last block at which the auction will take place. Indexing it will allow you to query the block at which the auction ended. From that block you can extract the lease winning related events. (To query the block: GET `/blocks/{finishEnd}`.)

`auctionIndex`: The unique identifier for the auction. 

`leasePeriods`: The available lease period indexes that may be bid on for the specific `auctionIndex`. 


## Walkthrough

### Relay-chain Dev Setup for auctions (SKIP if you already have a development setup)!
-------------

The begining of this guide will start by briefly introducing setting up a simple parachain enviornment if you dont already know how or dont have one set for local developement. 

Start by cloning [polkadot](https://github.com/paritytech/polkadot) and checking out the `rococo-v1` branch. NOTE: Before compiling make sure to adjust the [EndingPeriod](https://github.com/paritytech/polkadot/blob/rococo-v1/runtime/rococo/src/lib.rs#L745) to `100`, and [LeasePeriod](https://github.com/paritytech/polkadot/blob/rococo-v1/runtime/rococo/src/lib.rs#L761) to `100` so the auction time is fit for local development. You can then follow this [gist](https://gist.github.com/emostov/a58f887fce6af8a9b4aa2421114836c5) to get your alice and bob dev validator nodes up. Then you can call those extrinsic calls with the polkadot-js UI. 

### Using Sidecar to find the auction winners

`/experimental/paras/auctions/current` ENDPOINT

An auction will either be in two phases `starting` or `ending`. During this period when querying the endpoint you will receive a `finishEnd` which will denote the last block where the `AuctionClosed` event will take place as well as the `Leased` event. These events will be under the `on_initialize` key. 

It is important to index this block for the current `auctionIndex` because this will be your source of truth of where the winners of the auction are stored. 

The next important part is the `leasePeriods` that corresponds to the current `auctionIndex`. We use these available `leasePeriods` to compare the winning results and see which `paraId`'s took which slots. (Note that this is a redundant way to find the auction winners when coupled with with watching for the `Leased` events)

By this point we have the below relationship. 

EX: (The below code snippet is just an example, format the data from the endpoint however is necessary)
```javascript
auctionIndex: {
    leasePeriods: [
        "String"
    ],
    finishEnd: '200'
}
```

`/blocks/:blockId` ENDPOINT

Once the auction is over, its time to query the `blocks` endpoint at the block height given in the `finishEnd` field, and retrieve the events inside of `on_initialize`.

Example Response
```
{
    authorId: ....,
    extrinsics:....
    ...
    on_initialize: {
        events: [
            {
                "method": {
                    "pallet": "slots",
                    "method": "Leased"
                },
                "data": [
                    '1000', // ParaId
                    '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc', // AccountId
                    '1', // LeasePeriod (begining of the lease period)
                    '4', // LeasePeriod (the count of the lease period)
                    '10000', // Balance (extra balance reserved)
                    '1000000000', // Balance (total balance) 
                ]
            },
            {
                "method": {
                    "pallet": "auctions",
                    "method": "AuctionClosed"
                },
                "data": [
                    ...
                ]
            }
        ]
    }
}
```

Now that you have all the paraId's that won slots for that auction, you can compare it with the data relavant to the `auctionIndex`. Comparing the `leasePeriod`'s that are available during the active auction, to the `leasePeriod`'s that have been won and denoted in the `Leased` events (there may be multiple if there are multiple winners) will give you all the winners for that auction. 