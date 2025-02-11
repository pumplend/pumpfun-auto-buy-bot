const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config()
const connection = new Connection(process.env.RPC, 'confirmed'); 
const programId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"); 
const web3 = require("./utils/web3");
const monitoredAddress =programId;
const sdk = require("@pumplend/pumplend-sdk")


const lend = new sdk.Pumplend(process.env.NETWORK) 
let lastTx = ""
async function loop ()
{
    const txs = await web3.getTransactionHistory(monitoredAddress,50);
    if(txs && txs?.length > 0)
        {
          
          var finalArr = await hashCheck(txs);
          for (let i = finalArr.length-1 ; i > -1 ; i--)
          {
            try{
            //   console.log(txs[i]?.signature)
              let tx = finalArr[i]
             
              await handleNewTx(tx)

              //Update indexer
              lastTx = tx.signature;
            }catch(e)
            {
              console.error(e)
            }

          }

        }    
}

async function handleNewTx(tx) {
  if(tx && tx?.signature )
  {
    const decode = await web3.getTransactionDetailsByHash(tx.signature);
    for( let i = 0 ; i < decode.length;i++)
    {
      await actions(tx.signature,decode[i])
    }
  }
}

async function hashCheck(rawData) {
    const latestTxHash =lastTx;
   
    for(let i = 0 ; i<=rawData.length ;i++)
    {
      //TODO , Add the out of index fetcher
      if(rawData[i]?.signature == latestTxHash.hash)
      {
        return rawData.slice(0, i);
      }
    }

    return rawData;
}

async function actions(hash,data) {
    if(data.name == "create")
        {
            console.log("🚀 New Token Create !!!",data.address[0])
        }else
        {
          console.log(`Unhandled instruction: ${data.name}`);
        }
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function init() {
  while(true)
  {
    try{
      await loop();
      await sleep(1000) //30s
    }catch(e){
      console.error(e)
    }
  }
}


// loop()

init()