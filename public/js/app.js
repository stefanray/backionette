$(document).ready(function(){

    var ErrorModel = Backbone.Model.extend();

    var GodCollection = Backbone.Collection.extend({
        url: 'https://athena-7.herokuapp.com/ancients.json',
        fetch: function(options) {

            var cacheData
            if(options && options.data && options.data.search) {
                cacheData = sessionStorage.getItem(options.data.search);
            }

            if(!cacheData) {
                // no cahce call fetch
                return Backbone.Collection.prototype.fetch.apply(this, arguments);
            } else {

                // found in cache
                resp = JSON.parse(cacheData);

                // functionality of collection.fetch only without the actual fetch
                options = options ? _.clone(options) : {};
                if (options.parse === void 0) options.parse = true;
                
                var success = options.success;
                var collection = this;
                var method = options.reset ? 'reset' : 'set';
                this[method](resp, options);
                if (success) success(collection, resp, options);

                collection.trigger('sync', collection, resp, options);
            }
        },

        parse: function(data, resp) {
        
            if(resp.data && resp.data.search) {
                sessionStorage.setItem(resp.data.search, JSON.stringify(data))
            }
            
            // massage different formats depending on search
            data = data.ancients || data;

            var parsed = _.map(data, function(row) {

                row.name = row.name.toUpperCase();
                row.end_of_an_era = moment(row.end_of_an_era).format("MMM Do YY");
                return row;
            });

            return parsed;
         }
    });

    var GodView = Marionette.ItemView.extend({
        template: Handlebars.compile($('#godTemplate').html())
    });

    var NoGodView = Marionette.ItemView.extend({
        template: Handlebars.compile($('#noGodTemplate').html())
    });

    var ErrorView = Marionette.ItemView.extend({
        template: Handlebars.compile($('#errorTemplate').html()),
        model: new ErrorModel()
    });

    var GodCollectionView = Backbone.Marionette.CompositeView.extend({
      
      childView: GodView,
      emptyView: NoGodView,
      template: Handlebars.compile($('#godsTemplate').html()),
      childViewContainer: "#list",

      collectionEvents: {
        sync: 'onSuccess',
        error: 'onError'
      },
      
      onShow: function() {
        this.collection.fetch();
      },

      onSuccess: function(data, resp) {
        this.$el.find('#error').empty();

        $(this.childViewContainer).show();
      },

      onError: function(data, resp) {
        var errorView = new ErrorView();
        errorView.model.set('error', resp.responseJSON.error);
        this.$el.find('#error').html(errorView.render().el);

        // hide list
        $(this.childViewContainer).hide();
      }


    });

    var SearchView = Marionette.ItemView.extend({
        template: Handlebars.compile($('#searchTemplate').html()),

        events: {
            'keyup #searchBox': 'search'
        },

        search: function(e) {
            var val = $(e.currentTarget).val();
            this.trigger('search', val);
        }
    });

    var AppLayoutView = Backbone.Marionette.LayoutView.extend({
      
      template: "#appLayoutTemplate",

      regions: {
        search: "#search",
        content: "#content"
      },

      el: 'body',

      onRender: function() {

        var godCollection = new GodCollection();
        var searchView = new SearchView();

        this.listenTo(searchView, 'search', function(text) {

            var data = {
                search: text
            };

            if (text === 'error') {
                data = {
                    error: true
                };
            }

            godCollection.fetch({
                data: data
            })
        });

        this.getRegion('search').show(searchView);

        this.getRegion('content').show(new GodCollectionView({
            collection: godCollection,
        }));
      }

    });

    var applayoutView = new AppLayoutView();
    applayoutView.render();

});

