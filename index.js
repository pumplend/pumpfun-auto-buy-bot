const { PublicKey, Commitment, Connection, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction, Transaction, Signer, VersionedMessage, Message, MessageV0 } = require('@solana/web3.js');
require('dotenv').config();
const bs58 = require('bs58');
const { serialize, deserialize, deserializeUnchecked } = require('borsh');
const sdk = require("@pumplend/raydium-js-sdk")
const RAYDIUM_AMM_MAINNET= new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8")
const rpcCon = new Connection(process.env.RPC, { commitment: 'finalized' });
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress,getAssociatedTokenAddressSync,createSyncNativeInstruction , createAssociatedTokenAccountInstruction, NATIVE_MINT } = require('@solana/spl-token');
const pumplend = require("@pumplend/pumplend-sdk")
let keypairs = Keypair.fromSecretKey(new Uint8Array(
    bs58.default.decode(process.env.SK)
));
const lend = new pumplend.Pumplend(
    "mainnet",
    new PublicKey("41LsHyCYgo6VPuiFkk8q4n7VxJCkcuEBEX99hnCpt8Tk"),
    undefined,
    new PublicKey("FVRXRzHXtG1UDdrVfLPoSTKD44cwx99XKoWAqcQqeNb")
)
const wsol =  new PublicKey("So11111111111111111111111111111111111111112")
class SwapBaseIn {
    constructor(properties) {
        this.max_amount_in = properties.max_amount_in;
        this.amount_out = properties.amount_out;
    }
}

const swapBaseInSchema = new Map([
    [
        SwapBaseIn,
        {
            kind: "struct",
            fields: [
                ["max_amount_in", "u64"],
                ["amount_out", "u64"],
            ],
        },
    ],
]);

async function sendTx(instruction,tips) {
    // console.log(instruction);

    let transaction = new Transaction().add(instruction);
    let recentBlockhash = (await rpcCon.getLatestBlockhash()).blockhash;
    // lend.txTips(transaction)
    transaction.recentBlockhash = recentBlockhash;
    transaction.feePayer = keypairs.publicKey;
    transaction.sign(keypairs);
    let tx = await rpcCon.sendRawTransaction(
        transaction.serialize()
    );
    console.log(tx);
}

async function raydiumBuy(data) {
    const value = new SwapBaseIn({ max_amount_in: 3*1e5, amount_out: 0 });
    const buffer = serialize(swapBaseInSchema, value);
    const bufferWithByte = new Uint8Array([9, ...buffer]);
    const buffer2 = Buffer.from(bufferWithByte);

    let instruction = new TransactionInstruction({
        keys: [
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: data.AmmId, isSigner: false, isWritable: true },
            { pubkey: data.AmmAuthority, isSigner: false, isWritable: false },
            { pubkey: data.AmmOpenOrders, isSigner: false, isWritable: true },
            { pubkey: data.PoolCoinTokenAccount, isSigner: false, isWritable: true },
            { pubkey: data.PoolPcTokenAccount, isSigner: false, isWritable: true },
            { pubkey: data.SerumProgramId, isSigner: false, isWritable: true },
            { pubkey: data.SerumMarket, isSigner: false, isWritable: true },
            { pubkey: data.SerumBids, isSigner: false, isWritable: true },
            { pubkey: data.SerumAsks, isSigner: false, isWritable: true },
            { pubkey: data.SerumEventQueue, isSigner: false, isWritable: true },
            { pubkey: data.SerumCoinVaultAccount, isSigner: false, isWritable: true },
            { pubkey: data.SerumPcVaultAccount, isSigner: false, isWritable: true },
            { pubkey: data.SerumVaultSigner, isSigner: false, isWritable: false },
            { pubkey: data.UserSourceTokenAccount, isSigner: false, isWritable: true },
            { pubkey: data.UserDestTokenAccount, isSigner: false, isWritable: true },
            { pubkey: keypairs.publicKey, isSigner: true, isWritable: false },
        ],
        programId: RAYDIUM_AMM_MAINNET,
        
        data: buffer2,
    });

    return await sendTx(instruction,0)
}

async function wrapSOL(amountSOL) {
    const connection = rpcCon;
    const user = keypairs.publicKey;
  
    const wSOLAccount = await getAssociatedTokenAddress(
      wsol,
      user,
      false, 
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const instructions = [];
    const accountInfo = await connection.getAccountInfo(wSOLAccount);
    if (!accountInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          user,
          wSOLAccount,
          user,
          NATIVE_MINT, 
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    const lamports = amountSOL * 1e9; 
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: wSOLAccount,
        lamports,
      })
    );
    instructions.push(createSyncNativeInstruction(wSOLAccount));
    const transaction = new Transaction().add(...instructions);
    let recentBlockhash = (await rpcCon.getLatestBlockhash()).blockhash;
    transaction.recentBlockhash = recentBlockhash;
    transaction.feePayer = keypairs.publicKey;
    transaction.sign(keypairs);
    let tx = await rpcCon.sendRawTransaction(
        transaction.serialize()
    );
    console.log("tx", tx);
  }

const raydiumBuy = async (token,amount) =>
{
    const ammid = await sdk.getDefaultPool(token,RAYDIUM_AMM_MAINNET,"mainnet")
    const AmmId = new PublicKey(ammid)
    const userToken = getAssociatedTokenAddressSync(
        token,
          keypairs.publicKey,
    )
    const wsolToken = getAssociatedTokenAddressSync(
        wsol,
        keypairs.publicKey,
  )
    const accounts =await sdk.addressFetch(AmmId,keypairs.publicKey ,wsolToken,userToken,rpcCon,"mainnet")
    await raydiumBuy(accounts);
    // await wrapSOL(0.01)
}

const pumpBuy = async (token,amount,max) =>
{
    const instruction = await lend.pump_buy(
        token,
        keypairs.publicKey,
        amount,
        max
    )

    await sendTx(
        instruction
    )
}

const main = async () => {
    
    

};

main();
