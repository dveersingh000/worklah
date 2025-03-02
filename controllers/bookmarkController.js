const BookMark=require('../models/bookmarkModel');


exports.addBookMark = async (req, res) => {
  try {
    const {jobId,userId}=req.body;
    //check if that bookmark already exist.
   
    const bookmark=await BookMark.findOne({jobId:jobId,userId:userId});
    if(bookmark){
        //check the status of bookmark - if true set to false and vice versa.
        bookmark.status=bookmark.status?false:true;
        await bookmark.save();
        return res.status(200).send({
            success:true,
            message:"updated bookmark successfully"
        })
    }
    const newBookmark=await BookMark.create({jobId:jobId,userId:userId,status:true});
    await newBookmark.save();

    return res.status(200).send({
        success:true,
        message:"bookmark created successfully"
    })
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};




exports.addBookMark = async (req, res) => {
    try {
      const {jobId,userId}=req.body;
      //check if that bookmark already exist.
     
      const bookmark=await BookMark.findOne({jobId:jobId,userId:userId});
      if(bookmark){
          //check the status of bookmark - if true set to false and vice versa.
          bookmark.status=bookmark.status?false:true;
          await bookmark.save();
          return res.status(200).send({
              success:true,
              message:"updated bookmark successfully"
          })
      }
      const newBookmark=await BookMark.create({jobId:jobId,userId:userId,status:true});
      await newBookmark.save();
  
      return res.status(200).send({
          success:true,
          message:"bookmark created successfully"
      })
      
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error", error });
    }
  };


exports.getBookMarks = async (req, res) => {
    try {
        const { userId } = req.query; // Get userId from URL params

        // Find all bookmarks for the given userId
        const bookmarks = await BookMark.find({ userId: userId });

        if (!bookmarks.length) {
            return res.status(404).json({
                success: false,
                message: "No bookmarks found for this user."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Bookmarks fetched successfully",
            bookmarks
        });
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        res.status(500).json({ message: "Server error", error });
    }
};
