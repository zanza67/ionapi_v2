/**
 *  Demo OAuth 2.0 IONAPI
 * 
 *  Author  : Giampaolo Spagoni
 *  Email   : giampaolo.spagoni@infor.com
 *  Title   : Technical Senior Solution Architect
 *  Company : INFOR - Infor OS Service EMEA
 *  Date    : 13th August 2018
 * 
 */


// Define all constants
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const jsonfile = require('jsonfile')
const fileUpload = require('express-fileupload');
const favicon = require('serve-favicon');
const getFQDN = require('get-fqdn');


if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  var localStorage = new LocalStorage('./scratch');
}

// clear localstorage at any start
localStorage.clear();

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs'); 
app.use(express.static(__dirname + "/public"));
// display infor image on url
app.use(favicon(path.join(__dirname,'public','image','favicon.ico')));
app.use(fileUpload());

app.use(bodyParser.urlencoded({extended:true}));

let fqdn = ""; 
getFQDN().then(fqd => fqdn = fqd).catch(console.error);

/**
 * Routing
 */

// this is the page specified in the Redirect URL when you register your app into ionapi
app.get('/redirect.html', function(req, res){
        let code = req.query.code;
        res.render('getToken',{code:code});
});


// default root - Home Page
app.get('/', function(req,res){
    let files;
    if (!fs.existsSync(__dirname + "/file")){
        fs.mkdirSync(__dirname + "/file");
    }    
 //   try {
      files = fs.readdirSync(__dirname + "/file");      
 //   } catch (error) {
 //     fs.mkdir(__dirname + "/file");
      // wait 1 sec otherwise i get error to read files from created folder
 //     setTimeout(()=>{},1000);
 //     files = fs.readdirSync(__dirname + "/file");      
 //   }
    res.render('home',{files:files});
});


/**
 * Upload ionapi file
 */
app.post('/upload/files', function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');
 
  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file 
  let sampleFile = req.files.sampleFile;
 
  // Use the mv() method to place the file somewhere on your server 
  sampleFile.mv(path.join(__dirname + '/file', sampleFile.name), function(err) {
    if (err)
      return res.status(500).send(err);
    localStorage.setItem('api',sampleFile.name);
    res.render('connect',{sampleFile:sampleFile.name});
  });
});


/**
 *  Redirect to the XI page for Approve / Deny
 */
app.post('/connect', function(req,res){
   console.log (req.body.api);
   let api = req.body.api;
    localStorage.setItem('api',api);
    
    jsonfile.readFile(__dirname + '/file/' + req.body.api, function(err, obj) {
        if (err) throw err;
         console.dir(obj);
		 		 
         // save ionapi data into localstorage
         if (localStorage.getItem('ti_' + api) === "undefined" || localStorage.getItem('ti_' + api) === null){
            localStorage.setItem('ti_' + api , obj.ti);
            localStorage.setItem('cn_' + api , obj.cn);
            localStorage.setItem('ci_' + api , obj.ci);
            localStorage.setItem('cs_' + api , obj.cs);
            localStorage.setItem('iu_' + api , obj.iu);
            localStorage.setItem('pu_' + api , obj.pu);
            localStorage.setItem('oa_' + api , obj.oa);
            localStorage.setItem('ot_' + api , obj.ot);
            localStorage.setItem('or_' + api , obj.or);
            localStorage.setItem('ev_' + api , obj.ev);
            localStorage.setItem('v_' + api , obj.v);
            console.log('obj.ru :' + obj.ru )
            if (obj.ru === undefined || obj.ru === null || obj.ru ===''){
                obj.ru = 'https://ionapi.herokuapp.com/redirect.html';
                localStorage.setItem('ru_' + api , obj.ru);
            }else{
                localStorage.setItem('ru_' + api , obj.ru);
            }            
         }
         var url = obj.pu + obj.oa + '?client_id=' + obj.ci + '&response_type=code&redirect_uri=https://ionapi.herokuapp.com/redirect.html';
         res.redirect(url);
        })
});

/**
 *  Get Access Token
 */

app.post('/access', function(req,res){
    let code = req.body.code;
    let api  = localStorage.getItem('api');
    console.log('code ' + code);
    var redirectUri = "https://ionapi.herokuapp.com/redirect.html";

    // Prepare data for request the access token
    var args =  {
                    form:
                    {
                        'redirect_uri': redirectUri,
                        'client_id': localStorage.getItem('ci_' + api),//'infor~62hEkBLpdrXINBI5Byh4NVAu9JuZmpO7NyMANis65xU',
                        'client_secret': localStorage.getItem('cs_' + api),//'50q9KvQmXbzitshbV79RIm030Oz3OSq1JBwly7ibjdzCZEmWr1UvhRRkaop-yYWyMUJLKtHCWTHU2cBXZ2OlJg',
                        'code': `${code}`,
                        'grant_type':'authorization_code'
                    },
                    
                    rejectUnauthorized: false
                }

       // Build the URL to call for getting access token
        var urlapi = localStorage.getItem('pu_' + api) + localStorage.getItem('ot_' + api);
        console.log('urlapi --> ' + urlapi);        
        request.post(urlapi, args, function(err,data,response){
                if(err)
                {
                    console.log('error');
                    console.log(err);
                }
                else{
                   console.log(response);
                   var outMessage = JSON.parse(response);
                    res.render('showToken',{outMessage:outMessage});
                }
        });    
});

/**
 *  Get Refresh Token
 */

app.post('/refresh', function(req,res){
  let refreshToken = req.body.refreshToken;
  let api  = localStorage.getItem('api');
  console.log('refreshToken ' + refreshToken);

  // Prepare data for request the refresh token
  var args =  {
                  form:
                  {
                      'refresh_token': `${refreshToken}`,
                      'client_id': localStorage.getItem('ci_' + api),//'infor~62hEkBLpdrXINBI5Byh4NVAu9JuZmpO7NyMANis65xU',
                      'client_secret': localStorage.getItem('cs_' + api),//'50q9KvQmXbzitshbV79RIm030Oz3OSq1JBwly7ibjdzCZEmWr1UvhRRkaop-yYWyMUJLKtHCWTHU2cBXZ2OlJg',
                      'grant_type':'refresh_token'
                  },
                  
                  rejectUnauthorized: false
              }

     // Build the URL to call for getting access token
      var urlapi = localStorage.getItem('pu_' + api) + localStorage.getItem('ot_' + api);
      console.log('urlapi --> ' + urlapi);        
      request.post(urlapi, args, function(err,data,response){
              if(err)
              {
                  console.log('error');
                  console.log(err);
              }
              else{
                 console.log(response);
                 var outMessage = JSON.parse(response);
                  res.render('showRefresh',{outMessage:outMessage});
              }
      });    
});


/**
 * Remove the ionapi file from server
 */
app.post('/remove', function(req,res){
    let api = req.body.api;
    fs.unlinkSync(path.join(__dirname + '/file', api));
    setTimeout(()=>{},1000);
    res.redirect('/');
});

/**
 * Start Server
 */
app.listen(port, function(){
    console.log('server started at http://localhost:' + port);
})