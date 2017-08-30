angular.module('starter.eamDB', [])
  .factory("eamDB", function ($q, $cordovaSQLite, $ionicPlatform) {
    var db;
    var is_debug = false;
    return {
      sqlBatch: function (sqls) {
        return $q.resolve(sqls)
          .then(function () {
            if (window.cordova) {
              return new Promise(function (resolve, reject) {
                window['sqlitePlugin'].openDatabase({name: DB_NAME, location: 'default'}, function (db) {
                     db.sqlBatch(sqls,function (res) {
                       resolve(res);
                     },function (err) {
                       reject(err);
                     });
                  },
                  function (err) {
                    reject(err);
                  })
              });
            } else {
              return new Promise(function (resolve,reject) {
                db= window.openDatabase(DB_NAME, "", "", 1024 * 1024 * 100);
                var startSqlBatch=Date.now();
                db.transaction(function (tx) {
                  var records = sqls.slice(0);
                  try{
                    (function () {
                      var callee=arguments.callee;
                      var record = records.splice(0,1)[0];
                      if(typeof record==='string'){
                        // console.log(record);
                        tx.executeSql(record,[],function ok(tranx,res) {
                          if(records.length===0){
                            if(isDebug)console.log("sqlBatch耗时："+(Date.now()-startSqlBatch)+"ms");
                            resolve(res);
                          }else{
                            // console.log(records.length);
                            callee();
                          }
                        },function error(tranx,err) {
                          console.error(err);
                          throw err;
                        });
                        return;
                      }
                      if(angular.isArray(record)&&record.length!==2){
                        throw new Error("传入的sqls语句格式错误");
                      }
                      tx.executeSql(record[0],record[1],function ok(tranx,res) {
                        if(records.length===0){
                          if(isDebug)console.log("sqlBatch耗时："+(Date.now()-startSqlBatch)+"ms");
                          resolve(res);
                        }else{
                          callee();
                        }
                      },function error(tranx,e) {
                        console.error(e);
                        throw e;
                      })
                    })()
                  }catch(e){
                    reject(e);
                  }
                })
              });

            }
          });
      },
      openDB: function (dbname, background, func) {
        if (window.cordova) {
          //$ionicPlatform.ready(function () {
          var options = {name: dbname, location: 'default'};
          if (typeof background != 'function') {
            db = $cordovaSQLite.openDB(options, background);
          } else {
            func = background;
            db = $cordovaSQLite.openDB(options);
          }
          if ($.isFunction(func)) {
            func();
          }
          //});
          return db;
        } else {
          //使用本地存储。
          if (typeof background == 'function') {
            func = background;
          }
          // console.log(window.openDatabase(dbname, "1.0", "", 1024 * 1024 * 100, func));
          return db = window.openDatabase(dbname, "", "", 1024 * 1024 * 100, func);
        }
      },
      deleteDB: function (dbName) {
        if (window.cordova && is_debug == false) {
          return $cordovaSQLite.deleteDB(dbName);
        } else {

        }
      },
      execute: function (db, query, binding) {
        // console.log("query " + query);

        if (window.cordova && is_debug == false) {
          return $cordovaSQLite.execute(db, query, binding);
        } else {
          var q = $q.defer();
          db.transaction(function (tx) {
            tx.executeSql(query, binding, function (tx, result) {
                q.resolve(result);
              },
              function (transaction, error) {
                console.log(JSON.stringify(error.message));
                q.reject(error);
              });
          });
          return q.promise;
        }
      },
      executeBatchSqls: function (db, batchSqls) {
        var defer = $q.defer();
        var start = new Date;
        db.transaction(function (tx) {
          async.eachSeries(batchSqls, function (sql, callback) {
            var inStart = new Date;
            try {
              tx.executeSql(sql, null, function (tx, result) {
                console.log("执行 " + sql + " 耗时： " + (new Date - inStart) + " ms");
                callback(null, result);
              }, function (transaction, error) {
                console.error("执行 " + sql + " 出错");
                callback(error);
              });
            } catch (exception) {
              console.error("执行 " + sql + " 出现异常" + JSON.stringify(exception, undefined, 2));
              callback(exception);
            }
          }, function (err) {
            console.log("执行批量sqls总共耗时：" + (new Date - start) + " ms");
            if (err) {
              console.error(err);
              defer.reject(err);
            } else {
              defer.resolve();
            }
          });
        });
        return defer.promise;
      },
      insertCollection: function (db, query, bindings) {
        if (window.cordova && is_debug == false) {
          return $cordovaSQLite.insertCollection(db, query, bindings);
        } else {
          var q = $q.defer();
          var coll = bindings.slice(0); // clone collection
          db.transaction(function (tx) {
            (function insertOne() {
              var record = coll.splice(0, 1)[0]; // get the first record of coll and reduce coll by one
              try {
                tx.executeSql(query, record, function (tx, result) {
                  if (coll.length === 0) {
                    q.resolve(result);
                  } else {
                    insertOne();
                  }
                }, function (transaction, error) {
                  q.reject(error);
                  return;
                });
              } catch (exception) {
                q.reject(exception);
              }
            })();
          });
          return q.promise;
        }
      },
      nestedExecute: function (db, query1, query2, binding1, binding2) {
        if (window.cordova && is_debug == false) {
          return $cordovaSQLite.nestedExecute(db, query1, query2, binding1, binding2);
        } else {
          var q = $q.defer();
          db.transaction(function (tx) {
              tx.executeSql(query1, binding1, function (tx, result) {
                q.resolve(result);
                tx.executeSql(query2, binding2, function (tx, res) {
                  q.resolve(res);
                });
              });
            },
            function (transaction, error) {
              q.reject(error);
            });

          return q.promise;
        }
      }
    }
  });
