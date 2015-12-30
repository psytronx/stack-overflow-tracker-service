// Routes for Stack Overflow Tracker API

const express = require('express');
const router = express.Router();
const Models = require(__base + 'lib/models');

module.exports = router;

// GET sotracker/pages/
// query parameters: login, q, page, timeAgo ('day', 'week', 'month')
router.get('/pages', function(req, res){

    const login = req.query['login']; // Todo - Use basic auth field instead

    const prFetchUserId = Models.User.findOne({login:login}).then(filterId); // Todo - if user not found, generate proper error response

    const prShowPages = prFetchUserId
        .then(showPagesViewedForUser)
        .then(generateResponse.bind(null, res))
        .catch(generateError.bind(null, res));

    function showPagesViewedForUser(userId){

        console.log('userId: ', userId);

        return Models.View.aggregate([
            {$match:{user: userId}},
            {$group:{_id:"$page", total:{$sum:1}}},
            {$lookup:{from:"pages", localField:"_id", foreignField:"_id", as:"pageData"}}
        ]).exec();

    }

    function generateResponse(res, data){
        console.log('views with page info: ', data);
        res.json(data);
    }

    function generateError(res, err){
        console.error(err);
        res.status(500).json(err);
    }

});


// POST sotracker/view/




function filterId(data){

    if (!data._id){
        throw new Error('Missing _id!');
    }
    return data._id;

}