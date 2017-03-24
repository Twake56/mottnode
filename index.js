var express = require('express');
var app = express();
var getJSON = require('get-json');
var _ = require('underscore');
//Summoners
var matt = {id:'31203597',name:'matt'}
var jake = {id:'45556126',name:'jake'}
var jerry = {id:'19139825',name:'jerry'}
var trevor = {id:'26767760',name:'trevor'}
var dave = {id:'32702702',name:'dave'}
var justin = {id:'45496123',name:'justin'}
var nick = {id:'75821827',name:'nick'}
var raf = {id:'532474',name:'nick'}
var surat = {id:'30852265',name:'surat'}
var steve = {id:'530530',name:'steve'}
var wes = {id:'47884918',name:'wes'}
var friends = [matt,jake,jerry,trevor,dave,justin,nick,raf,surat,steve,wes]
//global data variable


app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

var pg = require('pg');

function doesInclude(array, value){
  var ret = false;
  for(pos in array){
      if (array[pos] === value){
        ret = true;
      }
  }
  return ret;
};
function getJSONData(name, dbdata, callback){
  getJSON('https://na.api.pvp.net/api/lol/NA/v2.2/matchlist/by-summoner/' + name + '?api_key=00b2a454-86a1-4393-a729-fe3cb75d5f43', function(error, response){
      matchIds = [];
      data = response.matches;
      for (i in data){
        if (data[i].season == 'PRESEASON2017'){
          matchIds.push(data[i].matchId);
        };
      }
      //trevordata.matchids = matchIds
      callback(matchIds, dbdata);
  });
}
function getGameData(gameid, callback){
  getJSON('https://na.api.pvp.net/api/lol/NA/v2.2/match/' + gameid + '?api_key=00b2a454-86a1-4393-a729-fe3cb75d5f43', function(error, response){
      console.log("got data")
      data = response;
      callback(data);
  });
}
function sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ }
};
app.get('/db/:player/:data', function (request, response) {
  var player = request.params.player
  for (x in friends){
    if (player == friends[x].name){
      var current_player = friends[x]
    }
  };
  connectdb(current_player)
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('Select matchdata from '  + current_player.name, function(err, result){
      jsondata = []
      for (i in result.rows){
        if(result.rows[i].matchdata != null){
          jsondata.push(result.rows[i])
        }
      }

      response.setHeader('Content-Type', 'application/json')
      response.send(jsondata)
    })

  });//connect
});//get
function connectdb(current_player){
pg.connect(process.env.DATABASE_URL, function(err, client, done) {
  client.query('SELECT matchid FROM ' + current_player.name, function(err, result) {
    //done(err);
    var idsInDb = [];

    for (i in result.rows){

      idsInDb.push(result.rows[i].matchid);
    };
    getJSONData(current_player.id, idsInDb, function(matchids, dbids){
      for (j in matchids){
        //console.log(!doesInclude(matchids[j],dbids))
        if(!doesInclude(matchids[j],dbids) && matchids[j] != null){

          //console.log("adding " + matchids[j] + " to db")
          var temp = matchids[j];

          client.query('INSERT INTO ' + current_player.name + ' (matchid) values($1)', [temp], function(err, result){
            //done(err);
          });
        };
      };
    }); // get json data
  client.query('SELECT matchid FROM ' + current_player.name, function(err, result) {
  var gameIdsDb = [];
  for (i in result.rows){
    if(result.rows[i].matchid != null){
      gameIdsDb.push(result.rows[i].matchid)
    }
  };//Pull all matchids
  client.query('SELECT matchdata->> ($1) as matchid FROM ' + current_player.name,['matchId'], function(err, res) {
    var matchDataIds = [];

    for (j in res.rows){

      if(res.rows[j].matchid != null){
        matchDataIds.push(res.rows[j].matchid)
      };
    };

    if(gameIdsDb.length != matchDataIds.length || gameIdsDb == 0){//If matchids differ add difference
      var diff = _.difference(gameIdsDb, matchDataIds);
      console.log(matchDataIds.length + ' vs' +gameIdsDb.length);

      for(var x = 0; x < diff.length; x++){
        setTimeout(function(x){

        getGameData(diff[x], function(data){
          //Enters json object into db
          client.query('INSERT INTO ' + current_player.name + ' (matchdata) values($1)', [data], function(err, result){

              console.log('match data logged');//When data is written to db
      });//insertdata

    })//getgamedata
  }, 3000 * x,x);//Timer times index for api limits
  };//forloop

}
  });

  });

  }); //initial query

}); //client connect
};
//SYNC player DB DATA
/*app.get('/db/:player/*', function (request, response) {
  var player = request.params.player
  for (x in friends){
    if (player == friends[x].name){
      var current_player = friends[x]
    }
  }
  connectdb();
  function connectdb(current){
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT matchid FROM ' + current_player.name, function(err, result) {
      //done(err);
      var idsInDb = [];

      for (i in result.rows){

        idsInDb.push(result.rows[i].matchid);
      };
      getJSONData(current_player.id, idsInDb, function(matchids, dbids){
        for (j in matchids){
          //console.log(!doesInclude(matchids[j],dbids))
          if(!doesInclude(matchids[j],dbids) && matchids[j] != null){

            //console.log("adding " + matchids[j] + " to db")
            var temp = matchids[j];

            client.query('INSERT INTO ' + current_player.name + ' (matchid) values($1)', [temp], function(err, result){
              //done(err);
            });
          };
        };
      }); // get json data
    client.query('SELECT matchid FROM ' + current_player.name, function(err, result) {
    var gameIdsDb = [];
    for (i in result.rows){
      if(result.rows[i].matchid != null){
        gameIdsDb.push(result.rows[i].matchid)
      }
    };//Pull all matchids
    client.query('SELECT matchdata->> ($1) as matchid FROM ' + current_player.name,['matchId'], function(err, res) {
      var matchDataIds = [];

      for (j in res.rows){

        if(res.rows[j].matchid != null){
          matchDataIds.push(res.rows[j].matchid)
        };
      };
      console.log(matchDataIds)

      if(gameIdsDb.length != matchDataIds.length || gameIdsDb == 0){//If matchids differ add difference
        var diff = _.difference(gameIdsDb, matchDataIds);
        console.log(matchDataIds.length + ' vs' +gameIdsDb.length);

        for(var x = 0; x < diff.length; x++){
          setTimeout(function(x){

          getGameData(diff[x], function(data){
            //Enters json object into db
            client.query('INSERT INTO ' + current_player.name + ' (matchdata) values($1)', [data], function(err, result){

                console.log('match data logged');//When data is written to db
        });//insertdata

      })//getgamedata
    }, 3000 * x,x);//Timer times index for api limits
    };//forloop

  }
    });

    });

    if (err)
     { console.error(err); response.send("Error " + err); }
    else
     { response.send(200);}//render('pages/db',{results: result.rows} ); }

    }); //initial query

  }); //client connect
};
}); //get
*/

app.listen(app.get('port'), function() {
  console.log('Node app is starting on port', app.get('port'));
});
