/**
 * Table Block Sort: the visitor tools of a core Table block on the page.
 *
 * The server marks each table with a class per tool it uses:
 * - `table-block-sort`: sorting. Each header cell of the last header row gets a button (the WAI-ARIA
 *   sortable table pattern); the header cell carries `aria-sort`. Only the body rows move.
 * - `table-block-sort-search`: the search field in the bar the server puts right before the table.
 *   Rows that do not match are hidden (ignoring case and accents) and the matches are highlighted.
 * - `table-block-sort-download`: the CSV download icon in the same bar.
 * - `table-block-sort-cards`: column names on every cell, shown as cards on phones by the stylesheet.
 * - `table-block-sort-link`: the sort and the search are kept in the page address.
 * - `data-table-block-sort-rows`: how many rows show before the "Show more" button under the table.
 *
 * Each column is sorted as numbers, dates or text, decided from all of its non-empty cells. Empty cells
 * always go last. Equal values keep their original order. Hidden rows are moved to the end of the
 * body, so striped rows still alternate among the visible ones. The footer stays where it is.
 */
( function () {
	'use strict';

	var lang = document.documentElement.lang || navigator.language || 'en';
	var collator = new Intl.Collator( lang, { numeric: true, sensitivity: 'base' } );
	var localeDecimal = localeSeparators( lang ).decimal;
	var dayFirst = isDayFirst( lang );
	// Each body row's position as the author wrote the table. Ties are broken by it.
	var originalIndex = new WeakMap();
	// Per table: the body rows in their current sort order, the search text of each row, the query.
	var tableState = new WeakMap();
	var MONTHS = monthNames( lang );
	var WEEKDAYS = weekdayNames( lang );
	// Cells that mean "no value": they sort last, like empty cells.
	var PLACEHOLDER = /^(?:-+|\u2013|\u2014|\?|\u2026|\.\.\.|n\/?a|tbd|tba|none|null|nil)$/i;
	var MULTIPLIERS = { k: 1e3, K: 1e3, M: 1e6, mn: 1e6, Mn: 1e6, mio: 1e6, Mio: 1e6, B: 1e9, bn: 1e9, Bn: 1e9, BN: 1e9, mrd: 1e9, Mrd: 1e9 };

	function localeSeparators( locale ) {
		var result = { decimal: '.', group: ',' };
		try {
			new Intl.NumberFormat( locale ).formatToParts( 12345.6 ).forEach( function ( part ) {
				if ( 'decimal' === part.type ) {
					result.decimal = part.value;
				} else if ( 'group' === part.type ) {
					result.group = part.value;
				}
			} );
		} catch ( e ) {}
		// Arabic separators are turned into "." and "," before reading (see toAscii).
		if ( '.' !== result.decimal && ',' !== result.decimal ) {
			result.decimal = '.';
		}
		return result;
	}

	function isDayFirst( locale ) {
		try {
			var parts = new Intl.DateTimeFormat( locale ).formatToParts( new Date( 2020, 10, 25 ) );
			for ( var i = 0; i < parts.length; i++ ) {
				if ( 'day' === parts[ i ].type ) {
					return true;
				}
				if ( 'month' === parts[ i ].type ) {
					return false;
				}
			}
		} catch ( e ) {}
		return true;
	}

	/**
	 * Month names in English and in the page's language, long and short, lowercase and without
	 * accents ("march", "mar", "marz" for German "März", "mart" for Turkish).
	 */
	function monthNames( locale ) {
		var names = {};
		'january february march april may june july august september october november december'.split( ' ' ).forEach( function ( name, m ) {
			names[ name ] = m;
			names[ name.slice( 0, 3 ) ] = m;
		} );
		names.sept = 8;
		[ 'long', 'short' ].forEach( function ( style ) {
			for ( var m = 0; m < 12; m++ ) {
				try {
					var date = new Date( Date.UTC( 2020, m, 15 ) );
					// The month as it appears next to a day (some languages change the word there) and alone.
					var options = [ { day: 'numeric', month: style, timeZone: 'UTC' }, { month: style, timeZone: 'UTC' } ];
					options.forEach( function ( option ) {
						new Intl.DateTimeFormat( locale, option ).formatToParts( date ).forEach( function ( part ) {
							if ( 'month' === part.type ) {
								var key = normalize( part.value ).replace( /\.$/, '' );
								if ( key && ! /^\d+$/.test( key ) ) {
									names[ key ] = m;
								}
							}
						} );
					} );
				} catch ( e ) {}
			}
		} );
		return names;
	}

	function weekdayNames( locale ) {
		var names = {};
		'sunday monday tuesday wednesday thursday friday saturday'.split( ' ' ).forEach( function ( name ) {
			names[ name ] = true;
			names[ name.slice( 0, 3 ) ] = true;
		} );
		[ 'long', 'short' ].forEach( function ( style ) {
			for ( var d = 0; d < 7; d++ ) {
				try {
					var key = normalize( new Intl.DateTimeFormat( locale, { weekday: style, timeZone: 'UTC' } ).format( new Date( Date.UTC( 2020, 0, 5 + d ) ) ) ).replace( /\.$/, '' );
					names[ key ] = true;
				} catch ( e ) {}
			}
		} );
		return names;
	}

	/**
	 * Arabic-Indic and Persian digits to 0-9, and the Arabic decimal and thousands signs to "." and ",".
	 */
	function toAscii( text ) {
		return text
			.replace( /[\u0660-\u0669]/g, function ( c ) {
				return String.fromCharCode( c.charCodeAt( 0 ) - 0x0660 + 48 );
			} )
			.replace( /[\u06f0-\u06f9]/g, function ( c ) {
				return String.fromCharCode( c.charCodeAt( 0 ) - 0x06f0 + 48 );
			} )
			.replace( /\u066b/g, '.' )
			.replace( /\u066c/g, ',' );
	}

	function isEmpty( text ) {
		return '' === text || PLACEHOLDER.test( text );
	}

	/**
	 * The number in one cell, before the decimal sign is known: its digits and separators ("1,234.50"),
	 * its sign and its multiplier. Handles currency symbols and codes before or after the digits
	 * ("$50", "US$ 50", "50 USD", "AED 1,200", "9,99 €"), K / M / B / bn / Mio, percent, units ("12 kg",
	 * "5 GB"), ranges ("$50-$100" counts as 50), "~" "<" ">" "+" in front, and negatives as "-5", "-$5",
	 * "$-5", "(5)". Returns null when the cell is not a number.
	 */
	function numberParts( text ) {
		var t = toAscii( text ).replace( /[\s\u00a0\u202f\u2009]+/g, '' );
		var range = t.match( /^(.*?\d)(?:-|\u2013|\u2014|to)(\D{0,4}\d.*)$/i );
		if ( range && /\d/.test( range[ 1 ] ) ) {
			var first = numberCore( range[ 1 ] );
			if ( first && numberCore( range[ 2 ] ) ) {
				return first;
			}
		}
		return numberCore( t );
	}

	function numberCore( text ) {
		var t = text;
		var negative = false;
		var multiplier = 1;
		var flip = function () {
			negative = ! negative;
			return '';
		};
		if ( /^\(.*\)$/.test( t ) ) {
			negative = true;
			t = t.slice( 1, -1 );
		}
		t = t.replace( /^[\u2212-]/, flip );
		t = t.replace( /^(?:[~\u2248<>\u2264\u2265\u00b1+]|ca\.|approx\.?)+/i, '' );
		t = t.replace( /^[\u2212-]/, flip );
		// Currency before the digits: a symbol, a code ("USD", "US$", "CA$") or an Arabic abbreviation.
		t = t.replace( /^(?:\p{Sc}|[A-Z]{1,4}\p{Sc}?|[\u0600-\u06ff.]+(?=\d))/u, '' );
		t = t.replace( /^[\u2212-]/, flip );
		for ( var pass = 0; pass < 4; pass++ ) {
			var before = t;
			// After the digits: currency, percent, "50,-", a trailing "+", and units ("kg", "km/h", "USD").
			t = t.replace( /(?:\p{Sc}|%|\u2030|[,.][-\u2013\u2014]|\+)$/u, '' );
			var scale = t.match( /\d(k|K|M|B|bn|Bn|BN|mn|Mn|mio|Mio|mrd|Mrd)\.?$/ );
			if ( scale ) {
				multiplier *= MULTIPLIERS[ scale[ 1 ] ];
				t = t.slice( 0, t.length - scale[ 0 ].length + 1 );
			} else {
				t = t.replace( /(\d)[\p{L}\u00b0\u00b5\u00b2\u00b3/.]{1,8}$/u, '$1' );
			}
			if ( t === before ) {
				break;
			}
		}
		t = t.replace( /[\u2212-]$/, flip );
		if ( ! /^\d[\d.,'\u2019]*$/.test( t ) && ! /^[.,]\d+$/.test( t ) ) {
			return null;
		}
		return { raw: t.replace( /['\u2019]/g, '' ), negative: negative, multiplier: multiplier };
	}

	/**
	 * Turns the cells of one column into numbers. The decimal sign is decided for the whole column:
	 * a cell with both "." and "," shows it (the last one is decimal), a sign used twice is a thousands
	 * sign, a sign followed by other than three digits is decimal. Only when no cell tells, the page's
	 * language decides. So "€9,99" reads as 9.99 on an English page and "$1.200" as 1200 on a German one.
	 */
	function resolveNumbers( list ) {
		var votes = { '.': 0, ',': 0 };
		list.forEach( function ( p ) {
			if ( ! p ) {
				return;
			}
			var dot = p.raw.lastIndexOf( '.' );
			var comma = p.raw.lastIndexOf( ',' );
			if ( -1 !== dot && -1 !== comma ) {
				votes[ dot > comma ? '.' : ',' ] += 2;
				return;
			}
			var sign = -1 !== dot ? '.' : ( -1 !== comma ? ',' : '' );
			if ( ! sign ) {
				return;
			}
			if ( p.raw.split( sign ).length > 2 ) {
				votes[ '.' === sign ? ',' : '.' ]++;
			} else if ( 3 !== p.raw.length - p.raw.lastIndexOf( sign ) - 1 ) {
				votes[ sign ]++;
			}
		} );
		var decimal = votes[ '.' ] === votes[ ',' ] ? localeDecimal : ( votes[ '.' ] > votes[ ',' ] ? '.' : ',' );
		var other = '.' === decimal ? ',' : '.';

		return list.map( function ( p ) {
			if ( ! p ) {
				return null;
			}
			// A cell that does not fit the column's decimal sign gets a second try with the other one,
			// so "2,5 Mio." still counts in a column of "1.2M" values.
			var value = readNumber( p.raw, decimal );
			if ( null === value ) {
				value = readNumber( p.raw, other );
			}
			if ( null === value ) {
				return null;
			}
			return ( p.negative ? -value : value ) * p.multiplier;
		} );
	}

	/**
	 * Reads "1,234.5" with the given decimal sign. Thousands signs must sit before groups of two or
	 * three digits (three for most languages, two in Indian grouping), so "1.5" is not 15.
	 */
	function readNumber( raw, decimal ) {
		var group = '.' === decimal ? ',' : '.';
		var pieces = raw.split( decimal );
		if ( pieces.length > 2 || ( pieces[ 1 ] && -1 !== pieces[ 1 ].indexOf( group ) ) ) {
			return null;
		}
		if ( -1 !== pieces[ 0 ].indexOf( group ) && ! new RegExp( '^\\d{1,3}(?:\\' + group + '\\d{2,3})*$' ).test( pieces[ 0 ] ) ) {
			return null;
		}
		var value = parseFloat( ( pieces[ 0 ].split( group ).join( '' ) || '0' ) + '.' + ( pieces[ 1 ] || '0' ) );
		return isNaN( value ) ? null : value;
	}

	/**
	 * Reads one cell as a number on its own (used for the CSV formula check).
	 */
	function parseNumber( text ) {
		var parts = numberParts( text );
		return parts ? resolveNumbers( [ parts ] )[ 0 ] : null;
	}

	function makeDate( y, m, d ) {
		if ( y < 100 ) {
			y += y < 70 ? 2000 : 1900;
		}
		var date = new Date( Date.UTC( y, m, d ) );
		if ( date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d ) {
			return null;
		}
		return date.getTime();
	}

	/**
	 * The date in one cell, before the day / month order of numeric dates is known. Reads ISO dates
	 * (2026-03-14, 2026/03/14, 2026-03), numeric dates (14.03.2026, 3/14/26), dates with month names in
	 * English or the page's language (14 March 2026, Mar 14th, 2026, 14. März 2026, March 2026), an
	 * optional weekday in front, an optional time (10:30, 9:05 PM, 2026-03-14T10:30:00Z) and times alone.
	 */
	function dateParts( text ) {
		var t = normalize( toAscii( text ) ).replace( /\s+/g, ' ' ).trim();
		var weekday = t.match( /^([\p{L}]+)\.?,?\s+(.*)$/u );
		if ( weekday && WEEKDAYS[ weekday[ 1 ] ] ) {
			t = weekday[ 2 ];
		}

		var time = 0;
		var clock = t.match( /(^|[\s,]+|\dt)(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:z|utc|gmt|[+-]\d{2}:?\d{2})?$/ );
		// The time comes after a space or comma, or right after the date's last digit and "T" (ISO).
		if ( clock ) {
			var h = +clock[ 2 ];
			var pm = clock[ 5 ] && 'p' === clock[ 5 ].charAt( 0 );
			if ( clock[ 5 ] && ( h < 1 || h > 12 ) ) {
				return null;
			}
			if ( clock[ 5 ] ) {
				h = ( h % 12 ) + ( pm ? 12 : 0 );
			}
			if ( h > 23 || +clock[ 3 ] > 59 ) {
				return null;
			}
			time = ( ( h * 60 + +clock[ 3 ] ) * 60 + ( +clock[ 4 ] || 0 ) ) * 1000;
			var cut = clock.index + ( /^\d/.test( clock[ 1 ] ) ? 1 : 0 );
			t = t.slice( 0, cut ).replace( /[\s,]+(?:at|um|saat|a las)$/, '' ).trim();
			if ( '' === t ) {
				return { timeOnly: true, time: time };
			}
		}

		var m = t.match( /^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?$/ );
		if ( m ) {
			return { y: +m[ 1 ], m: +m[ 2 ] - 1, d: m[ 3 ] ? +m[ 3 ] : 1, time: time };
		}
		m = t.match( /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/ );
		if ( m ) {
			return { a: +m[ 1 ], b: +m[ 2 ], y: +m[ 3 ], time: time };
		}

		// Month names: "14 march 2026", "march 14th, 2026", "14. marz 2026", "march 2026", "14 de marzo de 2026".
		var month = -1;
		var numbers = [];
		var tokens = t.split( /[\s,./-]+/ ).filter( function ( token ) {
			return token && ! /^(?:de|del|of|the)$/.test( token );
		} );
		for ( var i = 0; i < tokens.length; i++ ) {
			var token = tokens[ i ];
			var number = token.match( /^(\d{1,4})(?:st|nd|rd|th|er|e)?$/ );
			if ( number ) {
				numbers.push( number[ 1 ] );
			} else if ( -1 === month && MONTHS.hasOwnProperty( token ) ) {
				month = MONTHS[ token ];
			} else {
				return null;
			}
		}
		if ( -1 === month ) {
			return null;
		}
		if ( 1 === numbers.length && 4 === numbers[ 0 ].length ) {
			return { y: +numbers[ 0 ], m: month, d: 1, time: time };
		}
		if ( 2 === numbers.length ) {
			var yearFirst = 4 === numbers[ 0 ].length || +numbers[ 0 ] > 31;
			var year = yearFirst ? numbers[ 0 ] : numbers[ 1 ];
			var day = yearFirst ? numbers[ 1 ] : numbers[ 0 ];
			if ( year.length >= 2 && day.length <= 2 ) {
				return { y: +year, m: month, d: +day, time: time };
			}
		}
		return null;
	}

	/**
	 * Turns the cells of one column into times. Numeric dates like 03/04/2026 are read day first or
	 * month first for the whole column: a first number above 12 means day first, a second number above
	 * 12 means month first. Only when no cell tells, the page's language decides.
	 */
	function resolveDates( list ) {
		var dayVotes = 0;
		var monthVotes = 0;
		list.forEach( function ( p ) {
			if ( p && p.a ) {
				if ( p.a > 12 && p.b <= 12 ) {
					dayVotes++;
				} else if ( p.b > 12 && p.a <= 12 ) {
					monthVotes++;
				}
			}
		} );
		var useDayFirst = dayVotes && ! monthVotes ? true : ( monthVotes && ! dayVotes ? false : dayFirst );

		return list.map( function ( p ) {
			if ( ! p ) {
				return null;
			}
			if ( p.timeOnly ) {
				return p.time;
			}
			var date = p.a
				? ( useDayFirst ? makeDate( p.y, p.b - 1, p.a ) : makeDate( p.y, p.a - 1, p.b ) )
				: makeDate( p.y, p.m, p.d );
			return null === date ? null : date + p.time;
		} );
	}

	function cellText( cell ) {
		return cell ? ( cell.textContent || '' ).replace( /\s+/g, ' ' ).trim() : '';
	}

	/**
	 * Decides how a column sorts and returns one key per row. When more than half of the filled cells
	 * are dates, the column sorts by date; else when more than half are numbers, by number; else as
	 * text. In a date or number column, cells that are neither ("Free", "Ask us") come after the values
	 * in alphabetical order. Empty cells and placeholders ("-", "N/A") are null and always go last.
	 */
	function columnKeys( rows, index ) {
		var texts = rows.map( function ( row ) {
			return cellText( row.cells[ index ] );
		} );
		var filled = texts.filter( function ( t ) {
			return ! isEmpty( t );
		} ).length;
		var dates = resolveDates( texts.map( function ( t ) {
			return isEmpty( t ) ? null : dateParts( t );
		} ) );
		var numbers = resolveNumbers( texts.map( function ( t ) {
			return isEmpty( t ) ? null : numberParts( t );
		} ) );
		var count = function ( list ) {
			return list.filter( function ( v ) {
				return null !== v;
			} ).length;
		};
		var dateCount = count( dates );
		var numberCount = count( numbers );
		var values = null;
		if ( filled && dateCount * 2 > filled && dateCount >= numberCount ) {
			values = dates;
		} else if ( filled && numberCount * 2 > filled ) {
			values = numbers;
		}
		return {
			type: values ? 'value' : 'text',
			keys: texts.map( function ( t, i ) {
				if ( isEmpty( t ) ) {
					return null;
				}
				return values && null !== values[ i ] ? { value: values[ i ] } : { text: t };
			} ),
		};
	}

	function canSort( table ) {
		if ( ! table.tHead || ! table.tHead.rows.length || ! table.tBodies.length ) {
			return false;
		}
		var cells = table.querySelectorAll( 'thead th, thead td, tbody th, tbody td' );
		for ( var i = 0; i < cells.length; i++ ) {
			if ( cells[ i ].colSpan > 1 || cells[ i ].rowSpan > 1 ) {
				return false;
			}
		}
		return true;
	}

	function canSearch( table ) {
		var cells = table.tBodies[ 0 ].querySelectorAll( 'th, td' );
		for ( var i = 0; i < cells.length; i++ ) {
			if ( cells[ i ].rowSpan > 1 ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Lowercase, without accents, so "cafe" finds "Café" and "ORNEK" finds "Örnek".
	 */
	function normalize( text ) {
		var t = text.normalize( 'NFD' ).replace( /\p{M}/gu, '' );
		try {
			return t.toLocaleLowerCase( lang );
		} catch ( e ) {
			return t.toLowerCase();
		}
	}

	/**
	 * Puts the body rows in their current sort order and shows the ones that match the search, up to the
	 * "show more" limit. Hidden rows go last, so CSS that stripes every other row still alternates among
	 * the visible ones. Returns how many rows match.
	 */
	function showRows( table ) {
		var state = tableState.get( table );
		var matches = [];
		var others = [];
		state.order.forEach( function ( row ) {
			var match = '' === state.query || -1 !== state.text.get( row ).indexOf( state.query );
			( match ? matches : others ).push( row );
		} );
		var limit = state.pageSize ? state.shown : matches.length;
		matches.forEach( function ( row, i ) {
			row.hidden = i >= limit;
		} );
		others.forEach( function ( row ) {
			row.hidden = true;
		} );
		var fragment = document.createDocumentFragment();
		matches.concat( others ).forEach( function ( row ) {
			fragment.appendChild( row );
		} );
		table.tBodies[ 0 ].appendChild( fragment );
		state.matches = matches;
		updateMore( table );
		highlight( table );
		return matches.length;
	}

	/*
	 * Search matches are marked with the CSS Custom Highlight API: the cells' HTML is never changed.
	 * Browsers without it simply show no marks.
	 */
	var marks = window.CSS && CSS.highlights && window.Highlight ? new Highlight() : null;
	if ( marks ) {
		CSS.highlights.set( 'table-block-sort-match', marks );
	}

	function highlight( table ) {
		if ( ! marks ) {
			return;
		}
		var state = tableState.get( table );
		state.ranges.forEach( function ( range ) {
			marks.delete( range );
		} );
		state.ranges = [];
		if ( '' === state.query ) {
			return;
		}
		state.matches.forEach( function ( row ) {
			if ( row.hidden ) {
				return;
			}
			var walker = document.createTreeWalker( row, NodeFilter.SHOW_TEXT );
			for ( var node = walker.nextNode(); node; node = walker.nextNode() ) {
				markNode( node, state );
			}
		} );
	}

	/**
	 * Finds the query in one text node. The search ignores case and accents, so each character is
	 * normalized on its own and its position in the original text is kept for the range.
	 */
	function markNode( node, state ) {
		var text = node.nodeValue;
		var flat = '';
		var source = [];
		for ( var i = 0; i < text.length; i++ ) {
			var part = normalize( text.charAt( i ) );
			for ( var j = 0; j < part.length; j++ ) {
				flat += part.charAt( j );
				source.push( i );
			}
		}
		var at = flat.indexOf( state.query );
		while ( -1 !== at ) {
			var end = at + state.query.length - 1;
			var range = document.createRange();
			range.setStart( node, source[ at ] );
			range.setEnd( node, source[ end ] + 1 );
			marks.add( range );
			state.ranges.push( range );
			at = flat.indexOf( state.query, end + 1 );
		}
	}

	function updateMore( table ) {
		var state = tableState.get( table );
		if ( ! state.more ) {
			return;
		}
		var total = state.matches.length;
		var visible = Math.min( state.shown, total );
		state.more.hidden = visible >= total;
		state.moreStatus.textContent = state.moreStatus.getAttribute( 'data-text' )
			.replace( '%1$d', visible )
			.replace( '%2$d', total );
	}

	function wireMore( table ) {
		var state = tableState.get( table );
		var box = table.nextElementSibling;
		if ( ! box || ! box.classList.contains( 'table-block-sort__more' ) ) {
			state.pageSize = 0;
			return;
		}
		state.more = box;
		state.moreStatus = box.querySelector( '.table-block-sort__more-status' );
		box.querySelector( 'button' ).addEventListener( 'click', function () {
			state.shown += state.pageSize;
			showRows( table );
		} );
	}

	function sortTable( table, index, direction ) {
		var state = tableState.get( table );
		var rows = state.order.slice();
		var column = columnKeys( rows, index );
		var order = rows.map( function ( row, i ) {
			return i;
		} );
		var sign = 'descending' === direction ? -1 : 1;
		var tieBreak = function ( a, b ) {
			return originalIndex.get( rows[ a ] ) - originalIndex.get( rows[ b ] );
		};

		// Values first (in the chosen direction), then cells that are not values (A to Z), then empty cells.
		order.sort( function ( a, b ) {
			var ka = column.keys[ a ];
			var kb = column.keys[ b ];
			if ( null === ka || null === kb ) {
				if ( ka === kb ) {
					return tieBreak( a, b );
				}
				return null === ka ? 1 : -1;
			}
			var aValue = ka.hasOwnProperty( 'value' );
			var bValue = kb.hasOwnProperty( 'value' );
			var diff;
			if ( aValue && bValue ) {
				diff = ( ka.value - kb.value ) * sign;
			} else if ( aValue !== bValue ) {
				return aValue ? -1 : 1;
			} else {
				diff = collator.compare( ka.text, kb.text ) * ( 'text' === column.type ? sign : 1 );
			}
			return 0 === diff ? tieBreak( a, b ) : diff;
		} );

		state.order = order.map( function ( i ) {
			return rows[ i ];
		} );
		showRows( table );

		state.headers.forEach( function ( th, i ) {
			if ( i === index ) {
				th.setAttribute( 'aria-sort', direction );
			} else {
				th.removeAttribute( 'aria-sort' );
			}
		} );
		state.sort = { index: index, direction: direction };
		( state.menuButtons || [] ).forEach( function ( item ) {
			item.button.setAttribute( 'aria-pressed', item.index === index && item.direction === direction ? 'true' : 'false' );
		} );
		writeLink( table );
	}

	function addSortButtons( table ) {
		var state = tableState.get( table );
		state.headers.forEach( function ( th, index ) {
			var button = document.createElement( 'button' );
			button.type = 'button';
			button.className = 'table-block-sort__button';
			while ( th.firstChild ) {
				button.appendChild( th.firstChild );
			}
			var icon = document.createElement( 'span' );
			icon.className = 'table-block-sort__icon';
			icon.setAttribute( 'aria-hidden', 'true' );
			button.appendChild( icon );
			th.appendChild( button );

			button.addEventListener( 'click', function () {
				var next = 'ascending' === th.getAttribute( 'aria-sort' ) ? 'descending' : 'ascending';
				sortTable( table, index, next );
			} );
		} );
	}

	/**
	 * Cards on phones: every body and footer cell gets its column name, which the stylesheet shows
	 * next to the value when the screen is narrow.
	 */
	function addCardLabels( table ) {
		var names = tableState.get( table ).headers.map( cellText );
		var rows = Array.prototype.slice.call( table.tBodies[ 0 ].rows );
		if ( table.tFoot ) {
			rows = rows.concat( Array.prototype.slice.call( table.tFoot.rows ) );
		}
		rows.forEach( function ( row ) {
			Array.prototype.forEach.call( row.cells, function ( cell, i ) {
				if ( ! names[ i ] ) {
					return;
				}
				cell.setAttribute( 'data-label', names[ i ] );
				// One wrapper for the value, so the card lays out "name | value" even when the cell holds
				// several elements (text with a link, for example).
				var value = document.createElement( 'span' );
				value.className = 'table-block-sort__value';
				while ( cell.firstChild ) {
					value.appendChild( cell.firstChild );
				}
				cell.appendChild( value );
			} );
		} );
		table.classList.add( 'table-block-sort--cards' );
	}

	var SVG = 'http://www.w3.org/2000/svg';

	function svgIcon( path, className ) {
		var svg = document.createElementNS( SVG, 'svg' );
		svg.setAttribute( 'viewBox', '0 0 24 24' );
		svg.setAttribute( 'aria-hidden', 'true' );
		svg.setAttribute( 'focusable', 'false' );
		svg.setAttribute( 'class', className );
		var shape = document.createElementNS( SVG, 'path' );
		shape.setAttribute( 'd', path );
		svg.appendChild( shape );
		return svg;
	}

	var SORT_PATH = 'M8 4.5 3.5 9.5h3.25V19h2.5V9.5h3.25L8 4.5Zm8 15 4.5-5h-3.25V5h-2.5v9.5H11.5l4.5 5Z';
	var UP_PATH = 'M12 5 5.5 12l1.1 1.1 4.6-4.9V19h1.6V8.2l4.6 4.9 1.1-1.1L12 5Z';
	var DOWN_PATH = 'M12 19l6.5-7-1.1-1.1-4.6 4.9V5h-1.6v10.8l-4.6-4.9L5.5 12 12 19Z';

	/**
	 * Sorting on phones, for tables shown as cards: one sort icon in the bar above the table opens a
	 * small menu with each column name and an up (low to high) and a down (high to low) arrow. The
	 * header row is hidden on phones, so this replaces the header buttons there. Wording comes from the
	 * server, already translated.
	 */
	function addPhoneSort( table ) {
		var state = tableState.get( table );
		var words = {};
		try {
			words = JSON.parse( table.getAttribute( 'data-table-block-sort-words' ) || '{}' );
		} catch ( e ) {}
		var say = function ( key, fallback, name ) {
			return ( words[ key ] || fallback ).replace( '%s', name || '' );
		};

		var wrap = document.createElement( 'div' );
		wrap.className = 'table-block-sort__phone-sort';
		var toggle = document.createElement( 'button' );
		toggle.type = 'button';
		toggle.className = 'table-block-sort__icon-button table-block-sort__phone-sort-toggle';
		toggle.setAttribute( 'aria-label', say( 'sort', 'Sort' ) );
		toggle.setAttribute( 'title', say( 'sort', 'Sort' ) );
		toggle.setAttribute( 'aria-expanded', 'false' );
		toggle.appendChild( svgIcon( SORT_PATH, 'table-block-sort__phone-sort-icon' ) );

		var menu = document.createElement( 'div' );
		menu.className = 'table-block-sort__phone-sort-menu';
		menu.id = 'table-block-sort-menu-' + Math.random().toString( 36 ).slice( 2 );
		menu.setAttribute( 'role', 'group' );
		menu.setAttribute( 'aria-label', say( 'sort', 'Sort' ) );
		menu.hidden = true;
		toggle.setAttribute( 'aria-controls', menu.id );

		state.menuButtons = [];
		var close = function ( focusToggle ) {
			menu.hidden = true;
			toggle.setAttribute( 'aria-expanded', 'false' );
			if ( focusToggle ) {
				toggle.focus();
			}
		};

		state.headers.forEach( function ( th, index ) {
			var name = cellText( th );
			var row = document.createElement( 'div' );
			row.className = 'table-block-sort__phone-sort-row';
			var label = document.createElement( 'span' );
			label.className = 'table-block-sort__phone-sort-name';
			label.textContent = name;
			row.appendChild( label );
			[ [ 'ascending', UP_PATH, 'up', '%s: low to high' ], [ 'descending', DOWN_PATH, 'down', '%s: high to low' ] ].forEach( function ( option ) {
				var button = document.createElement( 'button' );
				button.type = 'button';
				button.className = 'table-block-sort__phone-sort-arrow';
				button.setAttribute( 'aria-label', say( option[ 2 ], option[ 3 ], name ) );
				button.setAttribute( 'aria-pressed', 'false' );
				button.appendChild( svgIcon( option[ 1 ], 'table-block-sort__phone-sort-icon' ) );
				button.addEventListener( 'click', function () {
					sortTable( table, index, option[ 0 ] );
					close( true );
				} );
				state.menuButtons.push( { index: index, direction: option[ 0 ], button: button } );
				row.appendChild( button );
			} );
			menu.appendChild( row );
		} );

		toggle.addEventListener( 'click', function () {
			var open = menu.hidden;
			menu.hidden = ! open;
			toggle.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
		} );
		wrap.addEventListener( 'keydown', function ( event ) {
			if ( 'Escape' === event.key && ! menu.hidden ) {
				close( true );
			}
		} );
		document.addEventListener( 'click', function ( event ) {
			if ( ! menu.hidden && ! wrap.contains( event.target ) ) {
				close( false );
			}
		} );
		wrap.appendChild( toggle );
		wrap.appendChild( menu );

		// First of the icons on the right of the bar above the table; a bar of its own when there is none.
		var box = table.previousElementSibling;
		var actions = box && box.classList.contains( 'table-block-sort__tools' ) && ! box.hidden ? box.querySelector( '.table-block-sort__actions' ) : null;
		if ( actions ) {
			actions.insertBefore( wrap, actions.firstChild );
		} else {
			var bar = document.createElement( 'div' );
			bar.className = 'table-block-sort__tools table-block-sort__tools--phone-only';
			actions = document.createElement( 'div' );
			actions.className = 'table-block-sort__actions';
			actions.appendChild( wrap );
			bar.appendChild( actions );
			table.parentNode.insertBefore( bar, table );
		}
		table.classList.add( 'table-block-sort--phone-sort' );
	}

	function runSearch( table ) {
		var state = tableState.get( table );
		state.query = normalize( state.input.value.trim() );
		state.shown = state.pageSize;
		var count = showRows( table );
		var status = state.status;
		if ( '' === state.query ) {
			status.textContent = '';
		} else if ( count ) {
			status.textContent = status.getAttribute( 'data-results' ).replace( '%d', count );
		} else {
			status.textContent = status.getAttribute( 'data-none' );
		}
		writeLink( table );
	}

	function wireSearch( table, box ) {
		var form = box.querySelector( '.table-block-sort__search' );
		var status = box.querySelector( '.table-block-sort__status' );
		if ( ! form || ! status ) {
			return false;
		}
		var state = tableState.get( table );
		state.input = form.querySelector( 'input' );
		state.status = status;
		form.hidden = false;
		// The field is in a search form (core's markup); Enter must not reload the page.
		form.addEventListener( 'submit', function ( event ) {
			event.preventDefault();
		} );
		state.input.addEventListener( 'input', function () {
			runSearch( table );
		} );
		return true;
	}

	/*
	 * Shareable links: the sort and the search are kept in the page address as
	 * ?table1-sort=price&table1-order=desc&table1-search=tea, so a copied link opens the same view.
	 * The number counts the tables with shareable links on the page, from the top.
	 */
	function columnSlugs( headers ) {
		var seen = {};
		return headers.map( function ( th, i ) {
			var slug = normalize( cellText( th ) ).replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' );
			if ( ! slug || seen[ slug ] ) {
				slug = String( i + 1 );
			}
			seen[ slug ] = true;
			return slug;
		} );
	}

	function writeLink( table ) {
		var state = tableState.get( table );
		if ( ! state.link || state.reading ) {
			return;
		}
		var url = new URL( window.location.href );
		var prefix = state.link + '-';
		var params = url.searchParams;
		if ( state.sort ) {
			params.set( prefix + 'sort', state.slugs[ state.sort.index ] );
			if ( 'descending' === state.sort.direction ) {
				params.set( prefix + 'order', 'desc' );
			} else {
				params.delete( prefix + 'order' );
			}
		}
		if ( state.input && '' !== state.input.value.trim() ) {
			params.set( prefix + 'search', state.input.value.trim() );
		} else {
			params.delete( prefix + 'search' );
		}
		window.history.replaceState( window.history.state, '', url.toString() );
	}

	function readLink( table ) {
		var state = tableState.get( table );
		var params = new URL( window.location.href ).searchParams;
		var prefix = state.link + '-';
		state.reading = true;
		var search = params.get( prefix + 'search' );
		if ( search && state.input ) {
			state.input.value = search;
			runSearch( table );
		}
		var sort = params.get( prefix + 'sort' );
		var index = sort && state.slugs ? state.slugs.indexOf( sort ) : -1;
		if ( -1 !== index && state.sortable ) {
			sortTable( table, index, 'desc' === params.get( prefix + 'order' ) ? 'descending' : 'ascending' );
		}
		state.reading = false;
	}

	/**
	 * One CSV field. Quotes it when needed, and puts an apostrophe before text that a spreadsheet would
	 * run as a formula ("=", "+", "@", or "-" that is not a number).
	 */
	function csvField( text ) {
		if ( /^[=+@\t\r]/.test( text ) || ( /^-/.test( text ) && null === parseNumber( text ) ) ) {
			text = "'" + text;
		}
		return /[",\r\n]/.test( text ) ? '"' + text.replace( /"/g, '""' ) + '"' : text;
	}

	function csvRow( row ) {
		var fields = [];
		Array.prototype.forEach.call( row.cells, function ( cell ) {
			fields.push( csvField( cellText( cell ) ) );
			// A merged cell keeps the columns lined up: one empty field for each extra column it covers.
			for ( var i = 1; i < cell.colSpan; i++ ) {
				fields.push( '' );
			}
		} );
		return fields.join( ',' );
	}

	/**
	 * The table as the visitor sees it: header rows, every body row that matches the search in the
	 * current sort order (also the ones behind "Show more"), and the footer rows unless a search is
	 * hiding rows (the footer's totals would not match them).
	 */
	function toCsv( table ) {
		var state = tableState.get( table );
		var rows = [];
		if ( table.tHead ) {
			rows = rows.concat( Array.prototype.slice.call( table.tHead.rows ) );
		}
		rows = rows.concat( state.matches );
		if ( table.tFoot && '' === state.query ) {
			rows = rows.concat( Array.prototype.slice.call( table.tFoot.rows ) );
		}
		// The byte order mark tells spreadsheet programs the file is UTF-8, so accents stay intact.
		return '\ufeff' + rows.map( csvRow ).join( '\r\n' ) + '\r\n';
	}

	function fileName( table ) {
		var figure = table.parentNode;
		var caption = figure && figure.querySelector( 'figcaption' );
		var name = normalize( cellText( caption ) ).replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' ).slice( 0, 60 ).replace( /-+$/, '' );
		return ( name || 'table' ) + '.csv';
	}

	function wireDownload( table, box ) {
		var button = box.querySelector( '.table-block-sort__download' );
		if ( ! button ) {
			return false;
		}
		button.hidden = false;
		button.addEventListener( 'click', function () {
			var name = fileName( table );
			var csv = toCsv( table );
			// A File carries its own name, which Safari uses when it ignores the link's "download" name.
			var file;
			try {
				file = new File( [ csv ], name, { type: 'text/csv;charset=utf-8' } );
			} catch ( e ) {
				file = new Blob( [ csv ], { type: 'text/csv;charset=utf-8' } );
			}
			var url = URL.createObjectURL( file );
			var link = document.createElement( 'a' );
			link.href = url;
			link.download = name;
			link.rel = 'noopener';
			link.style.display = 'none';
			document.body.appendChild( link );
			link.click();
			// Safari and Firefox read the file after the click returns; releasing it right away can make
			// them save it under a random name without ".csv". So it stays a while.
			setTimeout( function () {
				document.body.removeChild( link );
				URL.revokeObjectURL( url );
			}, 60000 );
		} );
		return true;
	}

	/**
	 * The share icon: the page address already holds the table's sort and search (see writeLink). On
	 * phones and tablets it opens the system share sheet; elsewhere it copies the address and says so.
	 */
	function wireShare( table, box ) {
		var button = box.querySelector( '.table-block-sort__share' );
		var status = box.querySelector( '.table-block-sort__share-status' );
		if ( ! button || ! status ) {
			return false;
		}
		var timer;
		var copied = function () {
			status.textContent = button.getAttribute( 'data-copied' );
			clearTimeout( timer );
			timer = setTimeout( function () {
				status.textContent = '';
			}, 2000 );
		};
		var copyFallback = function ( url ) {
			var field = document.createElement( 'textarea' );
			field.value = url;
			field.setAttribute( 'readonly', '' );
			field.style.position = 'fixed';
			field.style.opacity = '0';
			document.body.appendChild( field );
			field.select();
			try {
				document.execCommand( 'copy' );
				copied();
			} catch ( e ) {}
			document.body.removeChild( field );
		};
		button.hidden = false;
		button.addEventListener( 'click', function () {
			var url = window.location.href;
			var touch = window.matchMedia && window.matchMedia( '(pointer: coarse)' ).matches;
			if ( touch && navigator.share ) {
				navigator.share( { title: document.title, url: url } ).catch( function () {} );
			} else if ( navigator.clipboard && window.isSecureContext ) {
				navigator.clipboard.writeText( url ).then( copied, function () {
					copyFallback( url );
				} );
			} else {
				copyFallback( url );
			}
		} );
		return true;
	}

	var linkedTables = 0;

	function setUp( table ) {
		if ( table.hasAttribute( 'data-table-block-sort' ) || ! table.tBodies.length ) {
			return;
		}
		var has = function ( name ) {
			return table.classList.contains( name );
		};
		var sortable = has( 'table-block-sort' ) && canSort( table );
		var searchable = has( 'table-block-sort-search' ) && canSearch( table );
		var downloadable = has( 'table-block-sort-download' );
		var cards = has( 'table-block-sort-cards' ) && canSort( table );
		var pageSize = canSearch( table ) ? parseInt( table.getAttribute( 'data-table-block-sort-rows' ) || '0', 10 ) : 0;
		if ( ! sortable && ! searchable && ! downloadable && ! cards && ! pageSize ) {
			return;
		}
		table.setAttribute( 'data-table-block-sort', '' );

		var rows = Array.prototype.slice.call( table.tBodies[ 0 ].rows );
		var headRow = table.tHead && table.tHead.rows.length ? table.tHead.rows[ table.tHead.rows.length - 1 ] : null;
		var state = {
			order: rows,
			matches: rows,
			query: '',
			text: new WeakMap(),
			ranges: [],
			headers: headRow ? Array.prototype.slice.call( headRow.cells ) : [],
			sortable: sortable,
			pageSize: pageSize > 0 ? pageSize : 0,
			shown: pageSize > 0 ? pageSize : 0,
		};
		rows.forEach( function ( row, i ) {
			originalIndex.set( row, i );
			state.text.set( row, normalize( Array.prototype.map.call( row.cells, cellText ).join( ' ' ) ) );
		} );
		tableState.set( table, state );
		state.slugs = columnSlugs( state.headers );

		if ( cards ) {
			addCardLabels( table );
		}
		if ( sortable ) {
			addSortButtons( table );
		}
		var box = table.previousElementSibling;
		var hasBox = box && box.classList.contains( 'table-block-sort__tools' );
		var searchOn = hasBox && searchable && wireSearch( table, box );
		if ( has( 'table-block-sort-link' ) && ( sortable || searchOn ) ) {
			linkedTables++;
			state.link = 'table' + linkedTables;
		}
		if ( hasBox ) {
			var downloadOn = downloadable && wireDownload( table, box );
			var shareOn = !! state.link && wireShare( table, box );
			box.hidden = ! searchOn && ! downloadOn && ! shareOn;
		}
		if ( cards && sortable ) {
			addPhoneSort( table );
		}
		if ( state.pageSize ) {
			wireMore( table );
		}
		showRows( table );
		if ( state.link ) {
			readLink( table );
		}
	}

	function init() {
		var tables = document.querySelectorAll( 'table.table-block-sort, table.table-block-sort-search, table.table-block-sort-download, table.table-block-sort-cards, table[data-table-block-sort-rows]' );
		for ( var i = 0; i < tables.length; i++ ) {
			setUp( tables[ i ] );
		}
	}

	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
