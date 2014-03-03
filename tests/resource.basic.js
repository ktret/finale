var express = require('express'),
    request = require('request'),
    http = require('http'),
    expect = require('chai').expect,
    Sequelize = require('sequelize'),
    _ = require('lodash'),
    rest = require('../lib'),
    db = require('./lib/db'),
    User = require('./lib/user'),
    Address = require('./lib/address');

var test = {};
describe('Resource(basic)', function() {
  before(function(done) {
    User.hasMany(Address);
    done();
  });

  beforeEach(function(done) {
    db
      .sync({ force: true })
      .success(function() {
        test.app = express();
        test.app.use(express.json());
        test.app.use(express.urlencoded()); 

        rest.initialize({ app: test.app });
        rest.resource({
          model: User,
          endpoints: ['/users', '/users/:id']
        });

        test.server = http.createServer(test.app);
        test.server.listen(48281, null, null, function() {
          test.baseUrl =
            'http://' + test.server.address().address + ':' + test.server.address().port;
          done();
        });
      });
  });

  afterEach(function(done) {
    db
      .getQueryInterface()
      .dropAllTables()
      .success(function() {
        test.server.close(done);
      });
  });

  // TESTS
  describe('create', function() {
    it('should create a record', function(done) {
      request.post({
        url: 'http://localhost:48281/users',
        json: { username: 'arthur', email: 'arthur@gmail.com' }
      }, function(error, response, body) {
        expect(response.statusCode).to.equal(201);
        expect(response.headers.location).to.match(/\/users\/\d+/);
        done();
      });
    });
  });

  describe('read', function() {
    it('should read a record', function(done) {
      var userData = { username: 'jamez', email: 'jamez@gmail.com' };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;

        var path = response.headers.location;
        request.get({ url: test.baseUrl + path }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var record = _.isObject(body) ? body: JSON.parse(body);

          delete record.id;
          expect(record).to.eql(userData);
          done();
        });
      });
    });
  });

  describe('update', function() {
    it('should update a record', function(done) {
      var userData = { username: 'jamez', email: 'jamez@gmail.com' };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;

        var path = response.headers.location;
        request.put({ 
          url: test.baseUrl + path,
          json: { email: 'emma@fmail.co.uk' }
        }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);
          var record = _.isObject(body) ? body: JSON.parse(body);

          delete record.id;
          userData.email = 'emma@fmail.co.uk';
          expect(record).to.eql(userData);
          done();
        }); 
      });
    });
  });

  describe('delete', function() {
    it('should delete a record', function(done) {
      var userData = { username: "chicken", email: "chicken@gmail.com" };
      request.post({
        url: test.baseUrl + '/users',
        json: userData
      }, function(error, response, body) {
        expect(error).is.null;
        expect(response.headers.location).is.not.empty;

        var path = response.headers.location;
        request.del({ url: test.baseUrl + path }, function(err, response, body) {
          expect(response.statusCode).to.equal(200);

          request.get({ url: test.baseUrl + path }, function(err, response, body) {
            expect(response.statusCode).is.equal(404);
            done();
          });
        });
      });
    });
  });


  describe('list', function() {
    beforeEach(function() {
      test.userlist = [
        { username: "arthur", email: "arthur@gmail.com" },
        { username: "james", email: "james@gmail.com" },
        { username: "henry", email: "henry@gmail.com" },
        { username: "william", email: "william@gmail.com" },
        { username: "edward", email: "edward@gmail.com" }
      ];

      _(test.userlist).forEach(function(data) {
        request.post({
          url: test.baseUrl + '/users',
          json: data
        }, function(error, response, body) {
          expect(response).to.not.be.null;
          expect(response.statusCode).to.equal(201);
          expect(response.headers.location).to.match(/\/users\/\d+/);
        });
      });
    });

    afterEach(function() {
      delete test.userlist;
    });

    it('should list all records', function(done) {
      request.get({ url: test.baseUrl + '/users' }, function(err, response, body) {
        expect(response.statusCode).to.equal(200);
        var records = JSON.parse(body).map(function(r) { delete r.id; return r });
        expect(records).to.eql(test.userlist);
        expect(response.headers['content-range']).to.equal('items 0-4/5');
        done();
      });
    });

    it('should list some records using offset and count', function(done) {
      request.get({ url: test.baseUrl + '/users?offset=1&count=2' }, function(err, response, body) {
        expect(response.statusCode).to.equal(200);
        var records = JSON.parse(body).map(function(r) { delete r.id; return r });
        expect(records).to.eql(test.userlist.slice(1,3));
        expect(response.headers['content-range']).to.equal('items 1-2/5');
        done();
      });
    });

  });

});
