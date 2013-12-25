
/*
 * GET home page.
 */

exports.index = function(req, res){
  var env = req.app.get('env');
  var port = req.app.get('port');
  res.render('index', { title: 'Express', 'env': env, 'port': port });
};