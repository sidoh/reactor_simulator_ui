(function($) {
  var gridOptions = [
    { character: 'C', name: 'Gelid Cryotheum' },
    { character: 'E', name: 'Liquid Ender' },
    { character: 'D', name: 'Diamond Block' },
    { character: 'G', name: 'Graphite Block' },
    { character: 'X', name: 'Control Rod' },
  ];

  var tmpresponse = {"fuelConsumption":2.5585455894470215,"output":67931.921875,"fuelFertility":4.8164372,"coolantTemperature":20.0,"fuelHeat":2872.277,"reactorHeat":2783.1367,"reactorDefinition":{"xSize":9,"zSize":9,"height":13,"layout":"XXXXXXXXCXCXCXXXXXXXXXCXCXCXXXXXXXXXCXCXCXXXXXXXX","activelyCooled":false}};

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
        .attr('character', selected.data('character'))
        .append(getTextureImg(selected.data('character')));
  };

  var getLayoutStr = function() {
    var layout = "";

    $('.grid-table td.contents').each(function() {
      if ($(this).attr('character') === undefined) {
        layout += 'O';
      } else {
        layout += $(this).attr('character');
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
      createReactor($('#length').val(), $('#width').val(), $('#height').val());
      showPage('reactor-design');
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
          , definition = {
            xSize: params.x + 2,
            zSize: params.z + 2,
            height: params.height,
            layout: getLayoutStr(),
            isActivelyCooled: false
          };

      $.getJSON('/api/simulate', {definition: JSON.stringify(definition)})
          .done(displaySimulationResponse)
          .fail(function(jqhxr, textStatus, err) {
            var error = textStatus + ", " + err;
            $('#error-area').html(error);
          }
      );
    });

    $('.masthead-nav a').click(function() {
      showPage($(this).data('page'));
    });
  });
})(jQuery);