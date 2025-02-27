var MongoClient = require('mongodb').MongoClient;
require('dotenv').config()
    //DB name
const mainDB = process.env.SQL_NAME

//Sheet name
const sPosition = "positions";

/**
 * User sytstem 
 */

async function newPosition(data) {
    if ((await getPositionByToken(data.token)).length > 0) {
        return false;
    }
    const pool = await MongoClient.connect(process.env.SQL_HOST)
    var db = pool.db(mainDB);
    var ret = await db.collection(sPosition).insertOne(data);
    await pool.close();
    return ret;
}

async function updatePositionHash(token,hash) {
    const txs = await getPositionByToken(token)
    if ((txs).length > 0) {
        return false;
    }
    const id  = txs[0]._id;
    const pool = await MongoClient.connect(process.env.SQL_HOST)
    var db = pool.db(mainDB);
    var ret = await db.collection(sPosition).updateMany(
        {
            _id:id
        },
        {
            "$set": {
                hash:hash
            }
        }
    );
    await pool.close();
    return ret;
}

async function deletePositionById(token) {
    const txs = await getPositionByToken(token);
    
    if (txs.length === 0) {
        return false;
    }

    const id = txs[0]._id;  // 获取要删除记录的 id
    const pool = await MongoClient.connect(process.env.SQL_HOST);
    var db = pool.db(mainDB);
    
    // 删除指定 id 的记录
    var ret = await db.collection(sPosition).deleteOne({
        _id: id
    });

    await pool.close();
    return ret;
}
async function getPositionByToken(token) {
    const pool = await MongoClient.connect(process.env.SQL_HOST)
    var db = pool.db(mainDB);
    var ret = await db.collection(sPosition).find({
        token: token
    }).project({}).toArray();
    await pool.close();
    return ret;
}

async function getAllPosition(token) {
    const pool = await MongoClient.connect(process.env.SQL_HOST)
    var db = pool.db(mainDB);
    var ret = await db.collection(sPosition).find({
       
    }).project({}).toArray();
    await pool.close();
    return ret;
}

async function positionCount() {
    const pool = await MongoClient.connect(process.env.SQL_HOST)
    var db = pool.db(mainDB);
    var ret = await db.collection(sPosition).countDocuments({
        
    });
    await pool.close();
    return ret;
}

module.exports = {
    newPosition,
    updatePositionHash,
    deletePositionById,
    getPositionByToken,
    getAllPosition,
    positionCount
}