const express=require('express');
const { addBookMark, getBookMarks, removeBookMark  } = require('../controllers/bookmarkController');
const { authMiddleware } = require('../middlewares/auth');


const router = express.Router();


router.post('/',authMiddleware,addBookMark);
router.get('/',authMiddleware,getBookMarks);
router.delete('/remove',authMiddleware,removeBookMark);


module.exports=router

