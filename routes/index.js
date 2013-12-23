
/*
 * GET home page.
 */

exports.index = function(req, res){
  var env = req.app.get('env');
  res.render('index', { title: 'Express', 'env': env });
};