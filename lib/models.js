// Mongoose models for Stack Overflow Watch service

// Note: We don't use Mongoose to automatically add indices, since that's a bad practice.
// Please make sure indexes are created on mongo CLI, prior to starting this service:
//  db.pages.createIndex({title: 'text', tags: 'text'}, {name: 'Title/Tag Index', weights: {title: 1, tags:1}});
//  db.views.createIndex({time: 1}, {name: 'Time Index'});

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

// Define schemas and models
var pageSchema = Schema({
    bestAnswer: String,
    bestAnswerCreationDate: Date,
    bestAnswerId: Number,
    bestAnswerScore: Number,
    creationDate: Date,
    pathname: String, // Unique identifier
    question: String,
    tags: [String],
    title: String,
    url: String
}, { autoIndex: false });
pageSchema.index({title: 'text', tags: 'text'}, {name: 'Title/Tag Index', weights: {title: 1, tags:1}});

var viewSchema = Schema({
    page: { type: Schema.Types.ObjectId, ref: 'Page' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    time: Date
}, { autoIndex: false });
viewSchema.index({time: 1}, {name: 'Time Index'});

var userSchema = Schema({
    login: String
}, { autoIndex: false });

module.exports = {
    Page: mongoose.model('Page', pageSchema),
    View: mongoose.model('View', viewSchema),
    User: mongoose.model('User', userSchema)
};