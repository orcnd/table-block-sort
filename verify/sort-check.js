/**
 * Checks the sort of every two-column test table (Value, Expected) on the page: click the Value header
 * for low to high, again for high to low, and compare the Expected column with what it should read.
 * Used by verify/sort-cases.html and, pasted into the console, on the /sort-tests/ page of the demo site.
 *
 * Expected column: a number for a value (equal numbers may come in any order among themselves),
 * "text n" for a cell that is not a value, "last" for an empty cell.
 */
window.runSortTests = function () {
	function read( table ) {
		return Array.prototype.map.call( table.tBodies[ 0 ].rows, function ( row ) {
			var text = row.cells[ 1 ].textContent.trim();
			if ( 'last' === text ) {
				return { kind: 'e', rank: 0 };
			}
			var other = text.match( /^text (.+)$/ );
			return other ? { kind: 'o', rank: parseFloat( other[ 1 ] ) } : { kind: 'v', rank: parseFloat( text ) };
		} );
	}

	function expected( items, descending ) {
		var group = function ( kind ) {
			return items.filter( function ( i ) {
				return i.kind === kind;
			} );
		};
		var values = group( 'v' ).sort( function ( a, b ) {
			return descending ? b.rank - a.rank : a.rank - b.rank;
		} );
		var others = group( 'o' ).sort( function ( a, b ) {
			return a.rank - b.rank;
		} );
		return values.concat( others, group( 'e' ) );
	}

	function same( a, b ) {
		return a.length === b.length && a.every( function ( item, i ) {
			return item.kind === b[ i ].kind && ( 'e' === item.kind || item.rank === b[ i ].rank );
		} );
	}

	function show( items ) {
		return items.map( function ( i ) {
			return 'e' === i.kind ? 'last' : ( 'o' === i.kind ? 'text ' + i.rank : i.rank );
		} ).join( ', ' );
	}

	var results = [];
	document.querySelectorAll( 'table' ).forEach( function ( table ) {
		var head = table.tHead && table.tHead.rows[ 0 ];
		if ( ! head || 2 !== head.cells.length || 'Expected' !== head.cells[ 1 ].textContent.trim() ) {
			return;
		}
		var button = head.cells[ 0 ].querySelector( 'button' );
		var title = table.closest( 'figure' ).previousElementSibling;
		var name = title ? title.textContent.trim() : '?';
		[ false, true ].forEach( function ( descending ) {
			if ( ! button ) {
				results.push( { name: name, pass: false, note: 'no sort button' } );
				return;
			}
			button.click();
			var got = read( table );
			var want = expected( got, descending );
			results.push( {
				name: name + ( descending ? ' (high to low)' : ' (low to high)' ),
				pass: same( got, want ),
				got: show( got ),
				want: show( want ),
				values: Array.prototype.map.call( table.tBodies[ 0 ].rows, function ( row ) {
					return row.cells[ 0 ].textContent;
				} ).join( ' | ' ),
			} );
		} );
	} );
	return results;
};
