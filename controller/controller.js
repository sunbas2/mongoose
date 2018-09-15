// NPM PACKAGES REQUIRED
var express = require('express');
var router = express.Router();
var path = require('path');

//TO SCARPE NEED REQUEST AND CHEERIO
var request = require('request');
var cheerio = require('cheerio');

//MODELS REQUIRED
var Comment = require('../models/Comment.js');
var Article = require('../models/Article.js');

router.get('/', function(req, res) {
    res.redirect('/articles');
});


// The GET REQUEST FOR SCRAPING 
router.get('/scrape', function(req, res) {
    
    request('https://barrie.ctvnews.ca/', function(error, response, html) {
        
        var $ = cheerio.load(html);
        var titlesArray = [];
        
        $('listItem_7_700133_1501770355_390858948').each(function(i, element) {
            
            var result = {};

         
            result.title = $(this).children('a').text();
            result.link = $(this).children('a').attr('href');

            if(result.title !== "" && result.link !== ""){
         
              if(titlesArray.indexOf(result.title) == -1){

              
                titlesArray.push(result.title);

         
                Article.count({ title: result.title}, function (err, test){
                    
                  if(test == 0){

                   
                    var entry = new Article (result);

                    entry.save(function(err, doc) {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log(doc);
                      }
                    });

                  }
            });
        }
        
        else{
          console.log('Article already exists.')
        }

          }
        
          else{
            console.log('Not saved to DB, missing data')
          }
        });
        
        res.redirect('/');
    });
});

// THIS WILL GRAB ARTICLES FROM THE SITE 
router.get('/articles', function(req, res) {

    Article.find().sort({_id: -1})
 
        .exec(function(err, doc) {
            if(err){
                console.log(err);
            } else{
                var artcl = {article: doc};
                res.render('index', artcl);
            }
    });
});

router.get('/articles-json', function(req, res) {
    Article.find({}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    });
});

router.get('/clearAll', function(req, res) {
    Article.remove({}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            console.log('removed all articles');
        }

    });
    res.redirect('/articles-json');
});

router.get('/readArticle/:id', function(req, res){
  var articleId = req.params.id;
  var hbsObj = {
    article: [],
    body: []
  };

   
    Article.findOne({ _id: articleId })
      .populate('comment')
      .exec(function(err, doc){
      if(err){
        console.log('Error: ' + err);
      } else {
        hbsObj.article = doc;
        var link = doc.link;
        
        request(link, function(error, response, html) {
          var $ = cheerio.load(html);

          $('.l-col__main').each(function(i, element){
            hbsObj.body = $(this).children('.c-entry-content').children('p').text();
            
            res.render('article', hbsObj);
            
            return false;
          });
        });
      }

    });
});

// CREATE A COMMENT
router.post('/comment/:id', function(req, res) {
  var user = req.body.name;
  var content = req.body.comment;
  var articleId = req.params.id;

  var commentObj = {
    name: user,
    body: content
  };
 
  var newComment = new Comment(commentObj);

  newComment.save(function(err, doc) {
      if (err) {
          console.log(err);
      } else {
          console.log(doc._id)
          console.log(articleId)
          Article.findOneAndUpdate({ "_id": req.params.id }, {$push: {'comment':doc._id}}, {new: true})
  
            .exec(function(err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect('/readArticle/' + articleId);
                }
            });
        }
  });
});

module.exports = router;
