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

        // Todo - Implement other query params
        // Todo - Pagination
        // Todo - Search

    }

    function generateResponse(res, data){
        console.log('views with page info: ', data);
        res.json(data);
        // Todo - Add wrapper around data with pagination data
    }

    function generateError(res, err){
        console.error(err);
        res.status(500).json(err);
    }

});


// POST sotracker/view/
// query parameters: login
router.post('/views', function(req, res){

    var body = "";
    req.on('data', function(chunk){
        body += chunk;
    }).on('end', function(){

        try {
            body = JSON.parse(body);
        } catch(err){
            generateError(res, err);
            return;
        }

        console.log('body: ', body);

        const login = req.query['login']; // Todo - Use basic auth field instead
        const prFetchUserId = Models.User.findOne({login:login}).then(filterId); // Todo - if user not found, generate proper error response
        const prInsertPageViewToDb = prFetchUserId
            .then(insertPageViewToDb.bind(null, body))
            .then(generateResponse.bind(null, res))
            .catch(generateError.bind(null, res));

    });

    function generateResponse(res, data){
        console.log('views with page info: ', data);
        res.json(data);
        // Todo - Add wrapper around data with pagination data
    }

    function generateError(res, err){
        console.error(err);
        res.status(500).json(err);
    }

    function insertPageViewToDb(pageData, userId){

        var Page = Models.Page,
            prUpsertPage;

        if (!validatePageData(pageData)){
            return Promise.reject(new Error("pageData is invalid."));
        }

        // If page doesn't exist, create one
        var query = {path: pageData.path};
        prUpsertPage = Page.findOneAndUpdate(query, pageData, {upsert:true, new:true}).exec();
        return prUpsertPage
            .then(filterId)
            .then(saveView.bind(null, userId));

        function saveView(userId, pageId){

            console.log("in saveView");

            var view = new Models.View({
                page: pageId,
                user: userId,
                time: new Date()
            });

            return view.save();

        }

    }

    function validatePageData(pageData){
        // todo ... Implement this ...
        return pageData;
    }

});

function filterId(data){

    if (!data._id){
        throw new Error('Missing _id!');
    }
    return data._id;

}