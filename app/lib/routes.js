Router.configure({
    layoutTemplate: 'MasterLayout',
    loadingTemplate: 'Loading',
    notFoundTemplate: 'NotFound'
});


//Router.route('/', {
//  name: 'home',
//  controller: 'HomeController',
//  where: 'client'
//});

Router.route('/api/v1/onyx/:option?/:resource',
    function () {
        this.response.setHeader('Access-Control-Allow-Origin', '*');

        if (this.request.method === "OPTIONS") {
            this.response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            this.response.setHeader('Access-Control-Allow-Methods', 'POST, PUT, GET, DELETE, OPTIONS');
            this.response.end('Set OPTIONS.');
        } else {
            API.handleRequest(this, this.params, this.request.method);
        }
    }, {
        where: 'server'
    });