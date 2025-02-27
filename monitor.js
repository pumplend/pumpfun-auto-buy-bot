const { Connection, PublicKey ,getTransactionDetailsByHash} = require('@solana/web3.js');
require('dotenv').config()
const web3 = require("./utils/web3");
const connection = new Connection(process.env.RPC, 'confirmed',{wsEndpoint:process.env.WS});

const programId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

connection.onLogs(programId, async (logs, context) => {
  var tmp = "";
  for(i in logs.logs)
  {
    tmp+=logs.logs[i];
  }
  if(tmp.includes("Instruction: InitializeMint2"))
  {
    // console.log("🔥 Create it ! ", logs.signature)
    // console.log(logs)
    await handleNewTx(logs.signature)
  }
}, 'confirmed');

async function handleNewTx(tx) {
  if(tx)
  {
    const decode = await connection.getTransaction(tx, { commitment: "confirmed" ,"maxSupportedTransactionVersion": 0}); 
    for(i in decode.transaction.message.staticAccountKeys)
    {
        let b58add = decode.transaction.message.staticAccountKeys[i].toBase58()
        if(b58add.slice(b58add.length-4,b58add.length) == "pump")
        {
            
            //You fuond the token now 
            console.log(b58add)
        }
    }
  }
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
