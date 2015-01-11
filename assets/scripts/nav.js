
// --
// Hash navigation stuff
// --

var showPage
    , getHashLocation
    , updateHashParams
    , getHashParams
    , setHashParams;

(function($) {
  showPage = function(id, params) {
    var hash = '#' + id;

    if (params !== undefined) {
      hash += '?' + createHashParams(params);
    }

    location.hash = hash;
  };

  getHashLocation = function() {
    if (location.hash.length > 0) {
      return location.hash.substr(1).split('?')[0];
    } else {
      return null;
    }
  };

  getHashParams = function() {
    var hashLocation = location.hash.substr(1)
        , split = hashLocation.split('?')
        , params = {};

    if (split.length > 1) {
      var splitParams = split[1].split('&');

      for (var i = 0; i < splitParams.length; i++) {
        var kv = splitParams[i].split('=');
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
      }
    }

    return params;
  };

  setHashParams = function(params) {
    var queryParams = [];

    $.each(params, function(k, v) {
      queryParams.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });

    location.hash = getHashLocation() + '?' + createHashParams(params);
  };

  updateHashParams = function(params) {
    setHashParams($.extend(getHashParams(), params));
  };

  var handleNav = function() {
    var hashLocation = location.hash.substr(1)
        , id = hashLocation.split('?')[0];

    $('.page')
        .hide()
        .filter(function() { return $(this).attr('id') == id; }).show();
    $('.masthead-nav li')
        .removeClass('active')
        .filter(function() { return $('a', this).data('page') == id }).addClass('active');

    $(document).trigger('updateNav', [id, getHashParams()]);
  };

  var createHashParams = function(params) {
    var queryParams = [];

    $.each(params, function(k, v) {
      queryParams.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });

    return queryParams.join('&');
  };

  $(window).hashchange(handleNav);

  $(function() {
    $('.masthead-nav a').click(function() {
      showPage($(this).data('page'));
      return false;
    });

    handleNav();
  });
})(jQuery);

// --
// Tab stuff
// --

(function($) {
  $(function() {
    $('.tab-controls li').click(function() {
      var container = $(this).closest('.tab-container')
          , tabName = $(this).data('for');

      $('.tab', container)
          .removeClass('active')
          .filter(function() { return $(this).data('tab-name') == tabName; })
          .addClass('active');

      $('li', $(this).parent()).removeClass('active');
      $(this).addClass('active');

      return false;
    });

    $('.toggle-modes > li').click(function() {
      var parent = $(this).parent()
          .trigger('modeChange', $(this).data('option'));
      $('li', parent).removeClass('active');
      $(this).addClass('active');
    });
  });
})(jQuery);