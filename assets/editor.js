/**
 * Table Block Sort: editor controls for the core Table block.
 *
 * Plain script, no build step. It adds the visitor tool attributes to core/table, four toggle buttons
 * to the block toolbar (next to "Edit table": sort, search, stripes, download), a "More table tools"
 * menu after them (phone cards, sticky header, show more, shareable links) and a "Visitor tools" panel
 * with all of these to the block sidebar. Striped rows use core's own "Stripes" style, so the switch
 * and the Styles panel always agree.
 *
 * A control is disabled when the table cannot use it safely; its tooltip or help text says why.
 */
( function ( wp ) {
	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var __ = wp.i18n.__;
	var addFilter = wp.hooks.addFilter;
	var createHigherOrderComponent = wp.compose.createHigherOrderComponent;
	var BlockControls = wp.blockEditor.BlockControls;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var ToolbarButton = wp.components.ToolbarButton;
	var PanelBody = wp.components.PanelBody;
	var ToggleControl = wp.components.ToggleControl;
	var RangeControl = wp.components.RangeControl;
	var ToolbarDropdownMenu = wp.components.ToolbarDropdownMenu;
	var DEFAULT_ROWS = 10;
	var Stack = wp.components.__experimentalVStack || 'div';

	addFilter( 'blocks.registerBlockType', 'table-block-sort/attribute', function ( settings, name ) {
		if ( 'core/table' !== name ) {
			return settings;
		}
		var attributes = Object.assign( {}, settings.attributes, {
			sortable: { type: 'boolean', default: false },
			searchable: { type: 'boolean', default: false },
			downloadable: { type: 'boolean', default: false },
			phoneCards: { type: 'boolean', default: false },
			stickyHeader: { type: 'boolean', default: false },
			shareLinks: { type: 'boolean', default: false },
			rowsShown: { type: 'integer', default: 0 },
		} );
		return Object.assign( {}, settings, { attributes: attributes } );
	} );

	function someCell( sections, test ) {
		return sections.some( function ( rows ) {
			return ( rows || [] ).some( function ( row ) {
				return ( row.cells || [] ).some( test );
			} );
		} );
	}

	function spans( cell, key ) {
		return parseInt( cell[ key ] || 1, 10 ) > 1;
	}

	function sortReason( attributes ) {
		if ( ! attributes.head || ! attributes.head.length ) {
			return __( 'Turn on "Header section" in the block settings first. The header cells become the sort buttons.', 'table-block-sort' );
		}
		if ( someCell( [ attributes.head, attributes.body ], function ( cell ) {
			return spans( cell, 'colspan' ) || spans( cell, 'rowspan' );
		} ) ) {
			return __( 'This table has merged cells. Sorting would mix up its rows, so it stays off.', 'table-block-sort' );
		}
		return '';
	}

	function searchReason( attributes ) {
		if ( someCell( [ attributes.body ], function ( cell ) {
			return spans( cell, 'rowspan' );
		} ) ) {
			return __( 'This table has cells that span several rows. Hiding rows would break them, so this stays off.', 'table-block-sort' );
		}
		return '';
	}

	function cardsReason( attributes ) {
		if ( ! attributes.head || ! attributes.head.length ) {
			return __( 'Turn on "Header section" first. Its cells become the names on each card.', 'table-block-sort' );
		}
		if ( someCell( [ attributes.head, attributes.body, attributes.foot ], function ( cell ) {
			return spans( cell, 'colspan' ) || spans( cell, 'rowspan' );
		} ) ) {
			return __( 'This table has merged cells, which do not fit on cards.', 'table-block-sort' );
		}
		return '';
	}

	function stickyReason( attributes ) {
		if ( ! attributes.head || ! attributes.head.length ) {
			return __( 'Turn on "Header section" first. The header row is what stays in view.', 'table-block-sort' );
		}
		return '';
	}

	function hasStripes( className ) {
		return /(^|\s)is-style-stripes(\s|$)/.test( className || '' );
	}

	function withStripes( className, on ) {
		var classes = ( className || '' ).split( /\s+/ ).filter( function ( name ) {
			return name && 'is-style-stripes' !== name && 'is-style-regular' !== name;
		} );
		if ( on ) {
			classes.push( 'is-style-stripes' );
		}
		return classes.length ? classes.join( ' ' ) : undefined;
	}

	// Two arrows, up and down: the usual "sort" sign. Drawn here because WordPress has no sort icon.
	var sortIcon = el(
		'svg',
		{ xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true, focusable: false },
		el( 'path', { d: 'M8 4.5 3.5 9.5h3.25V19h2.5V9.5h3.25L8 4.5Zm8 15 4.5-5h-3.25V5h-2.5v9.5H11.5l4.5 5Z' } )
	);

	// A magnifying glass, the same shape as WordPress' "search" icon.
	var searchIcon = el(
		'svg',
		{ xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true, focusable: false },
		el( 'path', { d: 'M13 5c-3.3 0-6 2.7-6 6 0 1.4.5 2.7 1.3 3.7l-3.8 3.8 1.1 1.1 3.8-3.8c1 .8 2.3 1.3 3.7 1.3 3.3 0 6-2.7 6-6S16.3 5 13 5Zm0 10.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5Z' } )
	);

	// Three horizontal bands, the middle one lighter: striped rows.
	var stripesIcon = el(
		'svg',
		{ xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true, focusable: false },
		el( 'path', { d: 'M4 5h16v4H4V5Zm0 10h16v4H4v-4Z' } ),
		el( 'path', { d: 'M4 10h16v4H4v-4Z', opacity: 0.35 } )
	);

	// An arrow into a tray, the same shape as WordPress' "download" icon.
	var downloadIcon = el(
		'svg',
		{ xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true, focusable: false },
		el( 'path', { d: 'M18 11.3l-1-1.1-4 4V3h-1.5v11.3L7 10.2l-1 1.1 6.2 5.8 5.8-5.8zm.5 3.7v3.5h-13V15H4v5h16v-5h-1.5z' } )
	);

	function icon( d ) {
		return el(
			'svg',
			{ xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true, focusable: false },
			el( 'path', { d: d } )
		);
	}

	// Shapes of WordPress' own "settings", "mobile", "pin", "list" and "link" icons.
	var moreIcon = icon( 'M19 7.5h-7.6c-.3-.9-1.1-1.5-2.1-1.5s-1.8.6-2.1 1.5H5V9h2.2c.3.9 1.1 1.5 2.1 1.5s1.8-.6 2.1-1.5H19V7.5Zm-9.7 1.5c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8ZM19 15h-2.1c-.3-.9-1.1-1.5-2.1-1.5s-1.8.6-2.1 1.5H5v1.5h7.6c.3.9 1.1 1.5 2.1 1.5s1.8-.6 2.1-1.5H19V15Zm-4.2 1.5c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8Z' );
	var cardsIcon = icon( 'M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm.5 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12Zm-4.5-.5h2V16h-2v1.5Z' );
	var stickyIcon = icon( 'm21.5 9.1-6.6-6.6-4.2 5.6c-1.2-.1-2.4.1-3.6.7-.1 0-.1.1-.2.1-.5.3-.9.6-1.2.9l3.7 3.7-5.7 5.7v1.1h1.1l5.7-5.7 3.7 3.7c.4-.4.7-.8.9-1.2.1-.1.1-.2.2-.3.6-1.1.8-2.4.6-3.6l5.6-4.1Zm-7.3 3.5.1.9c.1.9 0 1.8-.4 2.6l-6-6c.8-.4 1.7-.5 2.6-.4l.9.1L15 4.9 19.1 9l-4.9 3.6Z' );
	var moreRowsIcon = icon( 'M4 4v1.5h16V4H4Zm8 8.5h8V11h-8v1.5ZM4 20h16v-1.5H4V20Zm4-8c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2Z' );
	var linkIcon = icon( 'M10 17.4H8.4A5.2 5.2 0 1 1 8.4 7H10v1.5H8.4a3.7 3.7 0 0 0 0 7.4H10v1.5ZM14 7h1.6a5.2 5.2 0 0 1 0 10.4H14v-1.5h1.6a3.7 3.7 0 0 0 0-7.4H14V7Zm-4.5 6h5v-1.5h-5V13Z' );

	function toolbarButton( icon, label, isOn, disabled, onClick ) {
		return el( ToolbarButton, {
			icon: icon,
			label: label,
			showTooltip: true,
			isPressed: isOn,
			disabled: disabled,
			accessibleWhenDisabled: true,
			onClick: onClick,
		} );
	}

	var withVisitorTools = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			if ( 'core/table' !== props.name ) {
				return el( BlockEdit, props );
			}
			var attributes = props.attributes;
			var noSort = sortReason( attributes );
			var noSearch = searchReason( attributes );
			var sortOn = ! noSort && !! attributes.sortable;
			var searchOn = ! noSearch && !! attributes.searchable;
			var stripesOn = hasStripes( attributes.className );
			var downloadOn = !! attributes.downloadable;
			var noCards = cardsReason( attributes );
			var noSticky = stickyReason( attributes );
			var noLinks = sortOn || searchOn ? '' : __( 'Turn on sortable columns or the search box first. The link keeps their state.', 'table-block-sort' );
			var cardsOn = ! noCards && !! attributes.phoneCards;
			var stickyOn = ! noSticky && !! attributes.stickyHeader;
			var rows = noSearch ? 0 : parseInt( attributes.rowsShown || 0, 10 );
			var linksOn = ! noLinks && !! attributes.shareLinks;
			var set = function ( name ) {
				return function ( value ) {
					var change = {};
					change[ name ] = value;
					props.setAttributes( change );
				};
			};
			var setRows = function ( on ) {
				props.setAttributes( { rowsShown: on ? DEFAULT_ROWS : 0 } );
			};
			var toggle = function ( label, help, reason, checked, onChange ) {
				return el( ToggleControl, {
					__nextHasNoMarginBottom: true,
					label: label,
					help: reason || help,
					checked: checked,
					disabled: !! reason,
					onChange: onChange,
				} );
			};
			var setStripes = function ( value ) {
				props.setAttributes( { className: withStripes( attributes.className, value ) } );
			};

			var sortLabel = noSort || ( sortOn
				? __( 'Sortable columns: on. Visitors can click a header to sort. Click to turn off.', 'table-block-sort' )
				: __( 'Make columns sortable', 'table-block-sort' ) );
			var searchLabel = noSearch || ( searchOn
				? __( 'Search box: on. Click to turn off.', 'table-block-sort' )
				: __( 'Add a search box', 'table-block-sort' ) );
			var stripesLabel = stripesOn
				? __( 'Striped rows: on. Click to turn off.', 'table-block-sort' )
				: __( 'Stripe the rows', 'table-block-sort' );
			var downloadLabel = downloadOn
				? __( 'Download button: on. Click to turn off.', 'table-block-sort' )
				: __( 'Add a "Download CSV" button', 'table-block-sort' );

			return el(
				Fragment,
				null,
				el( BlockEdit, props ),
				el(
					BlockControls,
					{ group: 'other' },
					toolbarButton( sortIcon, sortLabel, sortOn, !! noSort, function () {
						props.setAttributes( { sortable: ! sortOn } );
					} ),
					toolbarButton( searchIcon, searchLabel, searchOn, !! noSearch, function () {
						props.setAttributes( { searchable: ! searchOn } );
					} ),
					toolbarButton( stripesIcon, stripesLabel, stripesOn, false, function () {
						setStripes( ! stripesOn );
					} ),
					toolbarButton( downloadIcon, downloadLabel, downloadOn, false, function () {
						props.setAttributes( { downloadable: ! downloadOn } );
					} ),
					el( ToolbarDropdownMenu, {
						icon: moreIcon,
						label: __( 'More table tools', 'table-block-sort' ),
						controls: [
							{
								title: __( 'Cards on phones', 'table-block-sort' ),
								icon: cardsIcon,
								isActive: cardsOn,
								isDisabled: !! noCards,
								onClick: function () {
									props.setAttributes( { phoneCards: ! cardsOn } );
								},
							},
							{
								title: __( 'Sticky header', 'table-block-sort' ),
								icon: stickyIcon,
								isActive: stickyOn,
								isDisabled: !! noSticky,
								onClick: function () {
									props.setAttributes( { stickyHeader: ! stickyOn } );
								},
							},
							{
								title: __( 'Show more button', 'table-block-sort' ),
								icon: moreRowsIcon,
								isActive: rows > 0,
								isDisabled: !! noSearch,
								onClick: function () {
									setRows( ! rows );
								},
							},
							{
								title: __( 'Share button', 'table-block-sort' ),
								icon: linkIcon,
								isActive: linksOn,
								isDisabled: !! noLinks,
								onClick: function () {
									props.setAttributes( { shareLinks: ! linksOn } );
								},
							},
						],
					} )
				),
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'Visitor tools', 'table-block-sort' ) },
						el(
							Stack,
							{ spacing: 4 },
							el( ToggleControl, {
								__nextHasNoMarginBottom: true,
								label: __( 'Sortable columns', 'table-block-sort' ),
								help: noSort || __( 'Visitors click a header cell to sort the rows.', 'table-block-sort' ),
								checked: sortOn,
								disabled: !! noSort,
								onChange: function ( value ) {
									props.setAttributes( { sortable: value } );
								},
							} ),
							el( ToggleControl, {
								__nextHasNoMarginBottom: true,
								label: __( 'Search box', 'table-block-sort' ),
								help: noSearch || __( 'A search field above the table. Rows that do not match are hidden while visitors type.', 'table-block-sort' ),
								checked: searchOn,
								disabled: !! noSearch,
								onChange: function ( value ) {
									props.setAttributes( { searchable: value } );
								},
							} ),
							el( ToggleControl, {
								__nextHasNoMarginBottom: true,
								label: __( 'Striped rows', 'table-block-sort' ),
								help: __( 'Every other row gets a shaded background. This is the "Stripes" style from the Styles panel.', 'table-block-sort' ),
								checked: stripesOn,
								onChange: setStripes,
							} ),
							el( ToggleControl, {
								__nextHasNoMarginBottom: true,
								label: __( 'Download button', 'table-block-sort' ),
								help: __( 'A download icon above the table. Visitors get a CSV file of the rows as they see them: in their sort order and only the ones that match their search.', 'table-block-sort' ),
								checked: downloadOn,
								onChange: function ( value ) {
									props.setAttributes( { downloadable: value } );
								},
							} ),
							toggle(
								__( 'Cards on phones', 'table-block-sort' ),
								__( 'On small screens each row becomes a card, with the column name next to each value.', 'table-block-sort' ),
								noCards,
								cardsOn,
								set( 'phoneCards' )
							),
							toggle(
								__( 'Sticky header', 'table-block-sort' ),
								__( 'The header row stays in view while visitors scroll down a long table.', 'table-block-sort' ),
								noSticky,
								stickyOn,
								set( 'stickyHeader' )
							),
							toggle(
								__( 'Show more button', 'table-block-sort' ),
								__( 'Only the first rows show, with a "Show more" button under the table. Search, sorting and the download still use all rows.', 'table-block-sort' ),
								noSearch,
								rows > 0,
								setRows
							),
							rows > 0 && el( RangeControl, {
								__nextHasNoMarginBottom: true,
								__next40pxDefaultSize: true,
								label: __( 'Rows shown at first', 'table-block-sort' ),
								value: rows,
								min: 3,
								max: 100,
								onChange: function ( value ) {
									props.setAttributes( { rowsShown: value ? parseInt( value, 10 ) : DEFAULT_ROWS } );
								},
							} ),
							toggle(
								__( 'Share button', 'table-block-sort' ),
								__( 'A share icon above the table. It shares (on phones) or copies a link that opens the table with the same sort and search.', 'table-block-sort' ),
								noLinks,
								linksOn,
								set( 'shareLinks' )
							)
						)
					)
				)
			);
		};
	}, 'withTableBlockSortVisitorTools' );

	addFilter( 'editor.BlockEdit', 'table-block-sort/visitor-tools', withVisitorTools );
} )( window.wp );
