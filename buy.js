const { Connection, PublicKey ,Keypair ,Transaction  } = require('@solana/web3.js');
const {
  getAssociatedTokenAddressSync ,createAssociatedTokenAccountInstruction
} = require('@solana/spl-token');
const bs58 = require('bs58');
require('dotenv').config()
const web3 = require("./utils/web3");
const connection = new Connection(process.env.RPC, 'confirmed',{wsEndpoint:process.env.WS});
const pumplend = require("@pumplend/pumplend-sdk")
const programId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const db = require("./utils/db")
const lend = new pumplend.Pumplend(
    "mainnet"
)
let kp = Keypair.fromSecretKey(new Uint8Array(
  bs58.default.decode(process.env.SK)
));

const maxBuy = 25;
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
    try{
      await handleNewTx(logs.signature)
    }catch(e)
    {
      console.error(e)
    }
    
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
            const positionCount = await db.positionCount();
            if(positionCount<=maxBuy)
            {
              await buyToken(b58add)
            }else{
              console.log("reach max buy ")
            }
            
        }
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


async function buyToken(tk)
{
  //Storage to db to check if exsit already 
  await db.newPosition(
    {
      token:tk,
      amount:5*1e7,
      user:kp.publicKey,
      time:Date.now(),
      hash:""
    }
  )
  const transaction = new Transaction();
  const instruction = await lend.leverage_pump(3*1e7,new PublicKey(tk),kp.publicKey);
  const acc = getAssociatedTokenAddressSync(
    new PublicKey(tk),
    kp.publicKey,
    false
  )
  const userPDAInstruction = createAssociatedTokenAccountInstruction(kp.publicKey,acc,kp.publicKey,new PublicKey(tk));
  transaction.add(userPDAInstruction);
  transaction.add(instruction)

  const tx = await web3.localSendTx(transaction);
  if(tx)
  {
    console.log("TX Send Success ",tx)
    await db.updatePositionHash(tk,tx)
    return true;
  }else{
    console.log("TX Send Failed ",tx)
    await db.deletePositionById()
    return false;
  }
}