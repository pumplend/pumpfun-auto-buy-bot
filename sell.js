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
const miniPoolSize = 10;

async function getUserTokenList() {
    const myHeaders = new Headers();
    myHeaders.append("x-api-key", process.env.SHYFT_KEY);
  
    const tokenResponse = await fetch(`https://api.shyft.to/sol/v1/wallet/all_tokens?network=mainnet-beta&wallet=` + kp.publicKey.toBase58(), {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    });
    return (await tokenResponse.json()).result;
  }

async function loop() {
    // const positions = await db.getAllPosition();
    const positions = await getUserTokenList()
    for(i of positions)
    {
        const tokenCurve = await lend.tryGetPumpTokenCurveData(connection,new PublicKey(i.address));
        const poolSize = Number(tokenCurve.realSolReserves)/1e9;
        if(poolSize>miniPoolSize)
        {
            console.log("🍺 ",poolSize,i.address)
            await sellToken(i.address)
        }else{
            console.log(poolSize,i.address)
        }
        
        
    }
    
}

async function sellToken(tk)
{
  //Storage to db to check if exsit already 
  const transaction = new Transaction();
  const instruction = await lend.close_pump(new PublicKey(tk),kp.publicKey);
  transaction.add(instruction)

  const tx = await web3.localSendTx(transaction);
  if(tx)
  {
    console.log("TX Send Success ",tx)
    await db.deletePositionById(tk)
    return true;
  }else{
    console.log("TX Send Failed ",tx)
    await db.deletePositionById(tk)
    return false;
  }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
async function init() {
    while(true)
    {
        await loop();
        await sleep(60000);
    }
}

// loop();
init()