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
var raf = {id:'532474',name:'raf'}
var surat = {id:'30852265',name:'surat'}
var steve = {id:'530530',name:'steve'}
var wes = {id:'47884918',name:'wes'}
var friends = [matt,jake,jerry,trevor,dave,justin,nick,raf,surat,steve,wes]
//global data variable
var summoner_id = ['31203597', '45556126', '19139825', '26767760', '32702702', '45496123', '75821827', '532474', '30852265', '530530', '47884918']

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
      if (array[pos] == value){
        ret = true;
      }
  }
  return ret;
};
function getJSONData(name, dbdata, callback){
  getJSON('https://na.api.pvp.net/api/lol/NA/v2.2/matchlist/by-summoner/' + name + '?api_key=00b2a454-86a1-4393-a729-fe3cb75d5f43', function(error, response){
    if (error){console.log(error)}
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

app.get('/:player1/:player2', function(req,res){
  res.setHeader('Content-Type', 'application/json')
  res.status(200)
  res.send({'win_percent':100});
  var player1 = req.params.player1;
  var player2 = req.params.player2;
  for (x in friends){
    if (player1 == friends[x].name){
      var sum1 = friends[x]
    }
    if (player2 == friends[x].name && player2 != player1){
      var sum2 = friends[x]
    }
  };
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT matchid FROM loldata', function(err, result){
      var db_matches = result.rows
      for(var x = 0; x < summoner_id.length; x++){
      setTimeout(function(x){
        getJSONData(summoner_id[x], db_matches, function(match_ids,db_ids){
          for(i in match_ids){
            if(!doesInclude(db_ids, match_ids[i]) || db_ids.length == 0){

              client.query('INSERT INTO loldata (matchid, jdata, parts) values($1,$2,$3)',[match_ids[i],null,null], function(err, result){
                if (err){
                  //console.log('err logging matchid')
                }
                else{
                  console.log('match id logged')
                }
              })//client query


            }//if
          }//for loop
        })//get jsondata

      }, 500 * x,x);
    };//wrapper for loop

    });//clients
    client.query('SELECT matchid FROM loldata where jdata is NULL', function(err, result){
      var null_matches = result.rows;
      for(var y = 0; y < null_matches.length; y++){
        setTimeout(function(y){
          getGameData(null_matches[y].matchid, function(json_data){
            var matchId = json_data['matchId']
            client.query('UPDATE loldata SET jdata = $1 WHERE matchid = $2', [json_data, matchId], function(error, result){
              if(error){
                console.log(error);
              }
              else{
                console.log("logged game")
              }
            })
          })
        }, 3000 * y,y);
      }
    });//match query
    /*client.query("SELECT matchid from loldata WHERE parts is null", function(err,results){
      var matchList = results.rows;
      console.log(matchList.length)
      var dataList = [];
      for (it in matchList){
        client.query("SELECT jdata from loldata where matchid = $1", [matchList[it].matchid], function(err,result){
          var participantInfo = {data:[]}
          var match = result.rows[0];
          for(a in match.jdata.participantIdentities){
            var sumId = match.jdata.participantIdentities[a].player.summonerId
            var count = 0
            if(doesInclude(summoner_id,sumId)){
              var participant_id = match.jdata.participantIdentities[a].participantId
              var winner = match.jdata.participants[participant_id - 1].stats.winner
              participantInfo.data.push({'sumId':sumId, 'partId': participant_id,'winner':winner,'matchid':matchList[it].matchid})
            }

            if(a == 9){
            dataList.push(participantInfo);
            }

          }


          console.log(dataList.length + ' vs ' + matchList.length)
          if(dataList.length == matchList.length){

            for (k in dataList){

          client.query("UPDATE loldata SET parts = $1 WHERE matchid = $2",[dataList[k],dataList[k].data[0].matchid],function(err, result){
            if(err){
              console.log('error logging parts')
            }
            else{
              console.log(result)
            }

          })
        }
      }
        });//one match
      }

    })*/
    client.query("SELECT matchid from loldata t, json_array_elements(t.jdata::json->'participantIdentities') as elem where elem -> 'player' ->>'summonerId' = $1 INTERSECT SELECT matchid  from loldata t, json_array_elements(t.jdata::json->'participantIdentities') as elem where elem -> 'player' ->>'summonerId' = $2 INTERSECT select matchid from loldata where jdata ->> 'queueType' = 'TEAM_BUILDER_RANKED_SOLO'",[sum1.id,sum2.id], function(err, result){
      var commonMatches = result.rows;
      matchData = []

      for(x in commonMatches){
        client.query("SELECT jdata from loldata where matchid = $1", [commonMatches[x].matchid], function(err,result){
          var match = result.rows;
          matchData.push(match[0]);
          if(matchData.length  == commonMatches.length ){
            var participant_id = 0;
            var mutual_wins = 0;
            var mutual_losses = 0;
            for (z in matchData){

              for (y in matchData[z].jdata.participantIdentities){

                if (doesInclude(summoner_id,matchData[x].jdata.participantIdentities[y].player.summonerId)){

                  participant_id = matchData[z].jdata.participantIdentities[y].participantId
                  break;
                }
              }

              if (matchData[z].jdata.participants[participant_id - 1].stats.winner == true){
                mutual_wins += 1;
              }
              else if(matchData[z].jdata.participants[participant_id - 1].stats.winner == false){
                mutual_losses += 1;
              }
            }

            var duo_percentage = (mutual_wins/(mutual_wins + mutual_losses) * 100)
            res.setHeader('Content-Type', 'application/json')
            res.status(200)
            res.send({'win_percent':duo_percentage});
          }
        })
      }


  })//longquery

    //})
    });

  });


app.get('/db/:player/:data', function (request, response) {
  var player = request.params.player
  var data = request.params.data
  var second_player = null
  for (x in friends){
    if (player == friends[x].name){
      var current_player = friends[x]
    }
    if (data == friends[x].name && data != player){
      var second_player = friends[x]
    }
  };
  connectdb(current_player)
if(second_player != null){
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('Select matchdata from '  + current_player.name, function(err, result){
      jsondata = []

      for (i in result.rows){
        if(result.rows[i].matchdata != null && result.rows[i].matchdata.queueType == 'TEAM_BUILDER_RANKED_SOLO'){
          for (j in result.rows[i].matchdata.participantIdentities){
            if(result.rows[i].matchdata.participantIdentities[j].player.summonerId == second_player.id){
              jsondata.push(result.rows[i])
            }

          }
          //jsondata.push(result.rows[i])
          //console.log(result.rows[i].matchdata.participantIdentities)
        }
      }
      var participant_id = 0;
      var mutual_wins = 0;
      var mutual_losses = 0;
      for (x in jsondata){
        for (y in jsondata[x].matchdata.participantIdentities){

          if (doesInclude(summoner_id,jsondata[x].matchdata.participantIdentities[y].player.summonerId)){

            participant_id = jsondata[x].matchdata.participantIdentities[y].participantId
            break;
          }
        }

        if (jsondata[x].matchdata.participants[participant_id - 1].stats.winner == true){
          mutual_wins += 1;
        }
        else if(jsondata[x].matchdata.participants[participant_id - 1].stats.winner == false){
          mutual_losses += 1;
        }
      }

      var duo_percentage = (mutual_wins/(mutual_wins + mutual_losses) * 100)

      response.setHeader('Content-Type', 'application/json')
      response.status(200)
      response.send({'win_percent':duo_percentage});
    })

  });//connect
}
else{
  response.status(400)
  response.send('Second player incorrectly specified');
}
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

app.listen(app.get('port'), function() {
  console.log('Node app is starting on port', app.get('port'));
});
