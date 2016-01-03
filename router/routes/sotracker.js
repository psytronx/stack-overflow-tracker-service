// Routes for Stack Overflow Tracker API

const express = require('express');
const router = express.Router();
const Models = require(__base + 'lib/models');

module.exports = router;

// GET sotracker/pages/
// query parameters: login, q, start, count, timeAgo ('day', 'week', 'month')
router.get('/pages', function(req, res){

    const login = req.query['login'], // Todo - Use basic auth field instead
        query = req.query['q'],
        start = parseInt(req.query['start']) || 0,
        count = parseInt(req.query['count']) || 20;

    const prFetchUserId = Models.User.findOne({login:login}).then(prFilterId); // Todo - if user not found, generate proper error response
    var prGetPages;
    if (!query || !/\S/.test(query)) {
        // Query is empty or just whitespace. Do normal find.
        prGetPages = prFetchUserId
            .then(getPagesViewedForUser.bind(null, start, count))
            .then(massageJsonBeforeResponse)
            .then(generateResponse.bind(null, res))
            .catch(generateError.bind(null, res));
    } else {
        // Query is not empty. Do search.
        prGetPages = prFetchUserId
            .then(getPagesViewedForUserSearch.bind(null, start, count, query))
            .then(massageJsonBeforeResponse)
            .then(generateResponse.bind(null, res))
            .catch(generateError.bind(null, res));
    }

    function getPagesViewedForUser(start, count, userId){

        console.log('userId: ', userId);

        var command = Models.View.aggregate([
            {$match:{user: userId}},
            {$group:{_id:"$page", views:{$sum:1}}},
            {$lookup:{from:"pages", localField:"_id", foreignField:"_id", as:"pageData"}}
        ]).limit(count);

        if (start) command = command.skip(start);

        return command.exec();

        // Todo - Implement timeAgo

    }

    function getPagesViewedForUserSearch(start, count, query, userId){

        console.log('query: ', query);

        var command = Models.Page
            .find({$text: {$search: query}})
            .limit(count);

        if (start) command = command.skip(start);

        return command
            .exec()
            .then(getViewsPerPage);

        // Adds views field to each page
        function getViewsPerPage(pages){

            var prViewCounts = pages.map(function getViewCount (page){
                    return Models.View.aggregate([
                        {$match:{user: userId, page: page._id}},
                        {$group:{_id:"$page", views:{$sum:1}}},
                        {$lookup:{from:"pages", localField:"_id", foreignField:"_id", as:"pageData"}}
                    ]).exec();
                });

            return Promise.all(prViewCounts)
                    .then(concatArray);

        }

    }

    function massageJsonBeforeResponse(pages){

        return pages.map(function(page){
            var nicerPage = page.pageData[0];
            nicerPage.views = page.views;
            return nicerPage;
        });

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
        const prFetchUserId = Models.User.findOne({login:login}).then(prFilterId); // Todo - if user not found, generate proper error response
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
            .then(prFilterId)
            .then(saveView.bind(null, userId));

        function saveView(userId, pageId){

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

// Utility Methods:

// Return the id field of document from MongoDB.
function prFilterId(data){
    if (!data._id){
        throw new Error('Missing _id!');
    }
    return data._id;
}

// Strip out one layer of array using Array#concat. Useful for concatenating multiple MongoDB resultsets.
function concatArray(arrayOfArrays){
    return [].concat.apply([], arrayOfArrays);
}

// Returns function that calls console.log for result and then returns result for next step in promise chain.
function prlog(message){
    return function(result){
        console.log(message);
        return result;
    };
}
// Same as above function, and also appends result to message passed into console.log.
function prlogResult(message){
    return function(result){
        console.log(message, result);
        return result;
    };
}