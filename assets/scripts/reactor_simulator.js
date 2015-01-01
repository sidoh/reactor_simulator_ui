(function($) {
  var gridOptions = [
    { character: 'C', name: 'Gelid Cryotheum' },
    { character: 'E', name: 'Liquid Ender' },
    { character: 'D', name: 'Diamond Block' },
    { character: 'G', name: 'Graphite Block' },
    { character: 'X', name: 'Control Rod' },
  ];

  var MIN_SIZE = 5
      , MIN_HEIGHT = 3
      , MAX_SIZE = 32
      , MAX_HEIGHT = 48;

  var showPage = function(id) {
    $('.page')
        .hide()
        .filter(function() { return $(this).attr('id') == id; }).show();
    $('.masthead-nav li')
        .removeClass('active')
        .filter(function() { return $('a', this).data('page') == id }).addClass('active');
  };

  var createReactor = function(x, z, height) {
    x = parseInt(x);
    z = parseInt(z);
    height = parseInt(height);

    var reactorArea = $('#reactor-area')
        .html('')
        .data('x', x)
        .data('z', z)
        .data('height', height);

    var gridTable = $('<table class="grid-table"></table>')

    for (var i = 0; i <= x+1; i++) {
      var gridRow = $('<tr></tr>');

      for (var j = 0; j <= z+1; j++) {
        var elmt = $('<td></td>');

        if (i == 0 || i == x+1 || j == 0 || j == z+1) {
          if ((i == 0 && j == 0) || (i == x+1 && j == 0) || (i == 0 && j == z+1) || (i == x+1 && j == z+1)) {
            elmt.append(getTextureImg('casing-corner'));
          } else if (i == 0 || i == x+1) {
            elmt.append(getTextureImg('casing-lr'));
          } else {
            elmt.append(getTextureImg('casing-ud'));
          }
          elmt.addClass('casing');
        } else {
          elmt.addClass('contents');
        }

        gridRow.append(elmt);
      }

      gridTable.append(gridRow);
    }

    reactorArea.append(gridTable);
  };

  var selectGridOption = function(char) {
    $('.grid-option')
        .removeClass('selected')
        .filter(function() { return $(this).data('character') == char; })
        .addClass('selected');
  };

  var selectedGridOption = function() {
    return $('.grid-option.selected');
  };

  var getTextureImg = function(character) {
    return $('<div class="texture"></div>')
        .css('background-image', 'url(assets/textures/' + character + '.gif)')
        .html('&nbsp;');
  };

  var processCell = function() {
    var selected = selectedGridOption();

    $(this)
        .html('')
        .data('character', selected.data('character'))
        .append(getTextureImg(selected.data('character')));
  };

  var getLayoutStr = function() {
    var layout = "";

    $('.grid-table td.contents').each(function() {
      if ($(this).data('character') === undefined) {
        layout += 'O';
      } else {
        layout += $(this).data('character');
      }
    });

    return layout;
  };

  var displaySimulationResponse = function(response) {
    $('#error-area').html('');
    $('li', $('#simulation-results')).each(function() {
      var rawValue = response[$(this).data('for')]
          , roundedValue = Math.round(rawValue * 100) / 100
          ;

      $('.value', this).html(roundedValue);
    });
  };

  var validateReactorSize = function() {
    try {
      var x = parseInt($('#length').val());
      var z = parseInt($('#width').val());
      var height = parseInt($('#height').val());

      if (isNaN(x) || isNaN(z) || isNaN(height)) {
        return "Invalid input";
      } else if (x < MIN_SIZE || x > MAX_SIZE || z < MIN_SIZE || z > MAX_SIZE) {
        return "Length/width must be between " + MIN_SIZE + " and " + MAX_SIZE;
      } else if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
        return "Height must be between " + MIN_HEIGHT + " and " + MAX_HEIGHT;
      }
    } catch (e) {
      return "Invalid input";
    }

    return true;
  };

  var validateReactor = function() {
    var hasControlRods = $('.grid-table td.contents')
        .filter(function() { return $(this).data('character') === 'X' })
        .length > 0;

    if (! hasControlRods) {
      return "Reactor must have at least one control rod.";
    }

    return true;
  };

  $(function() {
    $.each(gridOptions, function(i, e) {
      var elmt = $('<div class="grid-option"></div>')
          .data('character', e.character)
          .data('name', e.name);
      elmt.append(getTextureImg(e.character));
      $('#controls-grid').append(elmt);
      console.log(elmt);
    });

    $('#new-reactor').click(function() { showPage('reactor-prompt'); })

    $('#create-reactor').click(function() {
      var validationResult = validateReactorSize();

      if (validationResult === true) {
        createReactor($('#length').val(), $('#width').val(), $('#height').val());
        showPage('reactor-design');
      } else {
        $('#error-area').html(validationResult);
      }
    });

    $('.grid-option').click(function() {
      selectGridOption($(this).data('character'));
    });

    $('body').on('click', '.grid-table td.contents', function() {
      processCell.call(this);
    });

    $('#fill').click(function() {
      $('.grid-table td.contents').each(function() { processCell.call(this); });
    });

    $('#simulate').click(function() {
      var reactorArea = $('#reactor-area')
          , params = reactorArea.data()
          , validationResult = validateReactor()
          , definition = {
            xSize: params.x + 2,
            zSize: params.z + 2,
            height: params.height,
            layout: getLayoutStr(),
            isActivelyCooled: false
          };

      if (validationResult !== true) {
        $('#error-area').html(validationResult);
      } else {
        $.getJSON('/api/simulate', {definition: JSON.stringify(definition)})
            .done(displaySimulationResponse)
            .fail(function (jqhxr, textStatus, err) {
              var error = textStatus + ", " + err;
              $('#error-area').html(error);
            }
        );
      }
    });

    $('.masthead-nav a').click(function() {
      showPage($(this).data('page'));
    });
  });
})(jQuery);