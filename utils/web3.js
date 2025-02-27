/**
 * This file is about solan-web3.js 
 * 
 * Provide base functios & instructions , including :
 * 1. solana sign verifiy
 * 2. solana get transactions by contract address 
 * 3. solana decode and analyze transaction details.
 * 4. solana base network states fetch
 */

const { Connection, PublicKey ,Keypair} = require("@solana/web3.js");
const { Program, AnchorProvider } = require("@project-serum/anchor");
const nacl = require('tweetnacl');
const idl = require("../idl/pump.json");
const { bs58 } = require("@project-serum/anchor/dist/cjs/utils/bytes");
require('dotenv').config()
const connection = new Connection(process.env.RPC, 'confirmed'); 
const programId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"); 

const kp = Keypair.fromSecretKey(
  bs58.decode(process.env.SK)
)

async function loadProgram() {
  return new Program(idl, programId, connection);
}

async function processInstruction(program, ix ,adds ,opts) {
  const add = [];
  ix.accounts.forEach(e => {
    add.push(
      adds[e]
    )
  });
  if (adds[ix.programIdIndex].toBase58() != program.programId.toBase58()) {
    return;
  }
  const decodedIx = program.coder.instruction.decode(ix.data,"base58");
  if (!decodedIx) {
    console.log("Unable to decode the instruction.");
    return;
  }
  // console.log("Decoded Instruction Name:", decodedIx.name);
  // console.log("Decoded Instruction Data:", decodedIx.data);

  return{
        name:decodedIx.name,
        inputData : decodedIx.data,
        blockTime : opts.blockTime,
        address:add
    }
}

async function parseTransactionByHash(txHash, program) {
    const transaction = await connection.getTransaction(txHash, { commitment: "confirmed" ,"maxSupportedTransactionVersion": 0});
    if (!transaction) {
      console.error("Transaction not found.");
      return;
    }
    // console.log(transaction)
    const instructions = transaction.transaction.message.instructions;
    let ret = [];
    if(!instructions || instructions?.length == 0 )
    {
      return ret
    }
    for (const ix of instructions) {
      const tmp = await processInstruction(program, ix,transaction.transaction.message.accountKeys,{blockTime:transaction.blockTime});
      if(tmp)
      {
          ret.push(
              tmp
          )
      }
  
    }
    return ret;
  }
  
async function parseTransaction(tx, program) {
  const transaction = tx;
  const instructions = transaction.transaction.message.instructions;
  let ret = [];
  for (const ix of instructions) {
    const tmp = await processInstruction(program, ix,transaction.transaction.message.accountKeys);
    if(tmp)
    {
        ret.push(
            tmp
        )
    }

  }
  return ret;
}



function verifySolanaSignature(message, signature, publicKey) {
    try {
      const pubKey = new PublicKey(publicKey);
      return nacl.sign.detached.verify(message, signature, pubKey.toBytes());
    } catch (error) {
      console.error('sign verfiy err ::', error);
      return false;
    }
}


async function getTransactionDetailsByHash(txHash) {  
    try {
        const program = await loadProgram();
        return await parseTransactionByHash(txHash, program);
    } catch (error) {
      console.error('Error getting transaction:', error);
      return false;
    }
  }

async function getTransactionDetails(txn) {  
    try {
        const program = await loadProgram();
        return await parseTransaction(txn, program);
    } catch (error) {
      console.error('Error getting transaction:', error);
      return false;
    }
  }
async function getTransactionHistory(address,pageSize) {
  try {
    const signatures = await connection.getSignaturesForAddress(address, {
      limit: pageSize,
    });

    return signatures;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return false;
  }
}

function getLocalPublicKey()
{
  return kp.publicKey
}

async function localSendTx(tx) {
  try{
    const { blockhash } = await connection.getRecentBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = kp.publicKey;
    await tx.sign(kp);
    const signature = await connection.sendTransaction(tx, [kp]);
    // console.log('Transaction sent with signature:', signature);
    const confirmation = await connection.confirmTransaction(signature);
    // console.log('Transaction confirmed:', confirmation);
    return signature;
  }catch(e)
  {
    console.error(e)
    return false;
  }

}

module.exports= {
    verifySolanaSignature,
    getTransactionDetailsByHash,
    getTransactionDetails,
    getTransactionHistory,
    getLocalPublicKey,
    localSendTx
}