var express = require('express')
var multer = require('multer')
var opencv = require('opencv')
var request = require('request')
var fs = require('fs')

var imageId = " ";
var port = process.env.PORT || 3000
var storage = multer.diskStorage({
  destination: function(req, file, callback){
    callback(null, 'Uploads/')
  },
  filename: function(req, file, callback){
    console.log("Image " + imageId + "has been uploaded to the server");
    callback(null, imageId+'.jpg');
  }
})
var upload = multer({storage: storage}).single('avatar')


var app = express();
app.listen(port);
console.log("Server listening to port" + port);


app.get('/', function(req, res){
  res.send("Hello world");
});

app.post('/upload/:imageId', function(req, res, next){
  imageId = req.params['imageId'];
  upload(req, res, function(err){

        if(err)
        {
          console.log("There was an error while uploading the file");
          console.log(err);
          res.send({"Error" : "Avatar Keyword is missing. Please use 'avatar' variable in your body part of your request"});
        }
        else {
          processDownloadImage(imageId, function(json){
            res.send(json);
          });
        }
  })
});

app.get('/getImage/:imageId', function(req, res){
  res.sendFile("Processed/"+req.params['imageId']+".jpg", {"root" : __dirname});
  // res.sendFile("package.json",{"root": __dirname})
})


app.get('/upload/url', function(req, res){
  console.log(req.query.url)
  imageId = Date.now() ;
  downloadImage(req.query.url, imageId , function(err){
    if(err)
    {
      res.send({"Error" : "The URL you sent is broken"})
    }
    else {
      processDownloadImage(imageId, function(json){
        res.send(json);
      });
    }

  })
})



function readImage(imageId, superCallback)
{
  opencv.readImage('Uploads/'+imageId+'.jpg', function(err, im){
    if(err)
    {
      console.log(err);
      returnJson = -1;
    }
    else
    {
      im.detectObject('Haarcascades/frontalface-alt2-haarcascade.xml', {}, function(err, faces){

        for(var i=0; i<faces.length; i++){
          face = faces[i];
          im.rectangle([face.x, face.y], [face.width, face.height], [0, 255, 0], 2);
        }

        im.save('Processed/'+imageId+'.jpg')
        console.log("Image Process Complete. Saved to the folder");
        return superCallback(faces, err)
      })
    }
  })
}

function downloadImage(uri,imageId,cb){
  request.head(uri, function(err, res, body){
    if(err)
      console.log(err, cb(err))
    else {
      console.log("Request success");
    };

    request(uri).pipe(fs.createWriteStream("./Uploads/"+imageId +".jpg")).on('close', cb);
  })
}

function processDownloadImage(imageId, cb)
{
  readImage(imageId, function(data, err) {
    if(err)
    {
      res.send(err);
    }
    else
    {
      var json = {};
      json["imageURL"] = "https://face-cedar-api.herokuapp.com/getImage/"+imageId;
      json["message"] = data.length + " faces detected."
      for(var i=0; i<data.length; i++)
      {
        json[i] = data[i];
      }
      cb(json)
    }
  });
}
