<?php
/**
 * Plugin Name:       Table Block Sort
 * Plugin URI:        https://github.com/orcnd/table-block-sort
 * Description:       Adds sortable columns, a search box, striped rows and a CSV download to the core Table block, from its toolbar and sidebar.
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            orcnd
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       table-block-sort
 *
 * @package TableBlockSort
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TABLE_BLOCK_SORT_VERSION', '0.1.0' );

/**
 * Adds the visitor tool attributes to core/table on the server, so it is part of the block's schema
 * (REST, block bindings, server rendering). The value lives in the block comment of each post.
 *
 * @param array  $args       Block type arguments.
 * @param string $block_type Block name.
 * @return array
 */
function table_block_sort_add_attribute( $args, $block_type ) {
	if ( 'core/table' !== $block_type ) {
		return $args;
	}
	if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
		$args['attributes'] = array();
	}
	foreach ( array( 'sortable', 'searchable', 'downloadable', 'phoneCards', 'stickyHeader', 'shareLinks' ) as $name ) {
		$args['attributes'][ $name ] = array(
			'type'    => 'boolean',
			'default' => false,
		);
	}
	// Rows shown before the "Show more" button; 0 shows all rows.
	$args['attributes']['rowsShown'] = array(
		'type'    => 'integer',
		'default' => 0,
	);
	return $args;
}
add_filter( 'register_block_type_args', 'table_block_sort_add_attribute', 10, 2 );

/**
 * Registers the front-end and editor assets. Nothing is printed until a page needs it.
 */
function table_block_sort_register_assets() {
	$url = plugin_dir_url( __FILE__ ) . 'assets/';

	wp_register_script(
		'table-block-sort-view',
		$url . 'view.js',
		array(),
		TABLE_BLOCK_SORT_VERSION,
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
	wp_register_style( 'table-block-sort-view', $url . 'view.css', array(), TABLE_BLOCK_SORT_VERSION );
}
add_action( 'init', 'table_block_sort_register_assets' );

/**
 * Loads the toolbar buttons and the "Visitor tools" sidebar panel.
 */
function table_block_sort_editor_assets() {
	wp_enqueue_script(
		'table-block-sort-editor',
		plugin_dir_url( __FILE__ ) . 'assets/editor.js',
		array( 'wp-hooks', 'wp-compose', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n' ),
		TABLE_BLOCK_SORT_VERSION,
		true
	);
	wp_set_script_translations( 'table-block-sort-editor', 'table-block-sort' );
}
add_action( 'enqueue_block_editor_assets', 'table_block_sort_editor_assets' );

/**
 * The bar placed above the table: the search field on the left, the download and share icons on the
 * right. Everything starts hidden and the script shows what works, so without JavaScript there are no
 * controls that do nothing.
 *
 * The search field is core's Search block markup (without its button, since results show while
 * typing), so it gets the theme's own search field styles. Its label ("Search this table") is for
 * screen readers only; the placeholder says "Search", short enough for a phone.
 *
 * @param bool $searchable   Whether to include the search field.
 * @param bool $downloadable Whether to include the download icon.
 * @param bool $share        Whether to include the share icon.
 * @return string
 */
function table_block_sort_tools( $searchable, $downloadable, $share ) {
	$html = '<div class="table-block-sort__tools" hidden>';
	if ( $searchable ) {
		$id    = wp_unique_id( 'table-block-sort-search-' );
		$label = __( 'Search this table', 'table-block-sort' );
		$html .= sprintf(
			'<form role="search" class="wp-block-search wp-block-search__no-button table-block-sort__search" hidden><label class="wp-block-search__label screen-reader-text" for="%1$s">%2$s</label><div class="wp-block-search__inside-wrapper"><input class="wp-block-search__input" id="%1$s" type="search" placeholder="%3$s" autocomplete="off"></div></form><p class="table-block-sort__status" role="status" data-results="%4$s" data-none="%5$s"></p>',
			esc_attr( $id ),
			esc_html( $label ),
			esc_attr__( 'Search', 'table-block-sort' ),
			/* translators: %d: number of table rows that match the search. */
			esc_attr__( 'Matching rows: %d', 'table-block-sort' ),
			esc_attr__( 'No rows match your search.', 'table-block-sort' )
		);
		wp_enqueue_style( 'wp-block-search' );
	}
	$html .= '<div class="table-block-sort__actions">';
	if ( $downloadable ) {
		$label = __( 'Download CSV', 'table-block-sort' );
		$html .= sprintf(
			'<button type="button" class="table-block-sort__icon-button table-block-sort__download" aria-label="%1$s" title="%1$s" hidden><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M18 11.3l-1-1.1-4 4V3h-1.5v11.3L7 10.2l-1 1.1 6.2 5.8 5.8-5.8zm.5 3.7v3.5h-13V15H4v5h16v-5h-1.5z"/></svg></button>',
			esc_attr( $label )
		);
	}
	if ( $share ) {
		$label = __( 'Share this view', 'table-block-sort' );
		$html .= sprintf(
			'<button type="button" class="table-block-sort__icon-button table-block-sort__share" aria-label="%1$s" title="%1$s" data-copied="%2$s" hidden><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9 11.8l6.1-4.5c.1.4.4.7.9.7h2c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1h-2c-.6 0-1 .4-1 1v.4l-6.4 4.8c-.2-.1-.4-.2-.6-.2H6c-.6 0-1 .4-1 1v2c0 .6.4 1 1 1h2c.2 0 .4-.1.6-.2l6.4 4.8v.4c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-2c0-.6-.4-1-1-1h-2c-.5 0-.8.3-.9.7L9 12.2v-.4z"/></svg></button><span class="table-block-sort__share-status" role="status"></span>',
			esc_attr( $label ),
			esc_attr__( 'Link copied', 'table-block-sort' )
		);
	}
	return $html . '</div></div>';
}

/**
 * The "Show more" bar placed under the table. Hidden until the script knows there are more rows.
 *
 * @return string
 */
function table_block_sort_more() {
	return sprintf(
		'<div class="table-block-sort__more" hidden><span class="table-block-sort__more-status" data-text="%1$s"></span><button type="button" class="wp-element-button table-block-sort__more-button">%2$s</button></div>',
		/* translators: 1: number of rows shown, 2: number of rows in the table (or matching the search). */
		esc_attr__( 'Showing %1$d of %2$d rows', 'table-block-sort' ),
		esc_html__( 'Show more', 'table-block-sort' )
	);
}

/**
 * Marks a table that uses any visitor tool, adds the bars above and under it and loads the script and
 * style on that page only. A striped table gets the style too, for stripes in the theme's colors.
 *
 * @param string $content Rendered block HTML.
 * @param array  $block   Parsed block.
 * @return string
 */
function table_block_sort_render( $content, $block ) {
	$attrs   = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
	$striped = ! empty( $attrs['className'] ) && preg_match( '/(^|\s)is-style-stripes(\s|$)/', $attrs['className'] );
	if ( $striped ) {
		// Stripes that follow the theme's text color (see view.css), also for tables without other tools.
		wp_enqueue_style( 'table-block-sort-view' );
	}
	$sortable     = ! empty( $attrs['sortable'] );
	$searchable   = ! empty( $attrs['searchable'] );
	$downloadable = ! empty( $attrs['downloadable'] );
	$cards        = ! empty( $attrs['phoneCards'] );
	$sticky       = ! empty( $attrs['stickyHeader'] );
	$links        = ! empty( $attrs['shareLinks'] );
	$rows_shown   = isset( $attrs['rowsShown'] ) ? max( 0, (int) $attrs['rowsShown'] ) : 0;
	if ( ( ! $sortable && ! $searchable && ! $downloadable && ! $cards && ! $sticky && ! $rows_shown ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
		return $content;
	}

	$tags = new WP_HTML_Tag_Processor( $content );
	if ( $sticky && $tags->next_tag( 'figure' ) ) {
		// Core lets the table scroll sideways inside the figure, which stops a sticky header from sticking.
		$tags->add_class( 'table-block-sort-has-sticky' );
	}
	if ( ! $tags->next_tag( 'table' ) ) {
		return $content;
	}
	$classes = array(
		'table-block-sort'          => $sortable,
		'table-block-sort-search'   => $searchable,
		'table-block-sort-download' => $downloadable,
		'table-block-sort-cards'    => $cards,
		'table-block-sort-sticky'   => $sticky,
		'table-block-sort-link'     => $links,
	);
	foreach ( $classes as $class => $on ) {
		if ( $on ) {
			$tags->add_class( $class );
		}
	}
	if ( $rows_shown ) {
		$tags->set_attribute( 'data-table-block-sort-rows', (string) $rows_shown );
	}
	if ( $cards && $sortable ) {
		// Wording for the sort menu that replaces the header buttons on phones.
		$tags->set_attribute(
			'data-table-block-sort-words',
			wp_json_encode(
				array(
					'sort' => __( 'Sort', 'table-block-sort' ),
					/* translators: %s: column name. */
					'up'   => __( '%s: low to high', 'table-block-sort' ),
					/* translators: %s: column name. */
					'down' => __( '%s: high to low', 'table-block-sort' ),
				)
			)
		);
	}
	$content = $tags->get_updated_html();

	if ( $rows_shown ) {
		$position = strripos( $content, '</table>' );
		if ( false !== $position ) {
			$content = substr_replace( $content, table_block_sort_more(), $position + strlen( '</table>' ), 0 );
		}
	}
	// The share icon needs something to share: a sort or a search.
	$share = $links && ( $sortable || $searchable );
	if ( $searchable || $downloadable || $share ) {
		$position = stripos( $content, '<table' );
		if ( false !== $position ) {
			$content = substr_replace( $content, table_block_sort_tools( $searchable, $downloadable, $share ), $position, 0 );
		}
	}

	wp_enqueue_script( 'table-block-sort-view' );
	wp_enqueue_style( 'table-block-sort-view' );

	return $content;
}
add_filter( 'render_block_core/table', 'table_block_sort_render', 10, 2 );
