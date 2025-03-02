const express=require('express');
const { addBookMark, getBookMarks } = require('../controllers/bookmarkController');
const { authMiddleware } = require('../middlewares/auth');


const router = express.Router();


router.post('/',authMiddleware,addBookMark);
router.get('/',authMiddleware,getBookMarks);


module.exports=router

