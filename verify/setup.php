<?php
/**
 * Creates the /tables/ page used by verify/README.md: one sortable table with every column type, one
 * sortable table with merged cells, one sortable table without a header row, one table left alone and
 * one sortable, searchable, striped table with a CSV download, phone cards, shareable links, 5 rows
 * before "Show more" and a caption, and one long table with a sticky header.
 */
require_once '/wordpress/wp-load.php';

$league = <<<'HTML'
<!-- wp:table {"hasFixedLayout":true,"sortable":true,"phoneCards":true} -->
<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Team</th><th class="has-text-align-right" data-align="right">Points</th><th>Budget</th><th>Founded</th><th>Next match</th></tr></thead><tbody><tr><td>Team 10</td><td class="has-text-align-right" data-align="right">7</td><td>$1,200</td><td>14.03.2019</td><td>Mar 14, 2026</td></tr><tr><td>Örnek FC</td><td class="has-text-align-right" data-align="right">12</td><td>$950.50</td><td>2001-07-01</td><td></td></tr><tr><td>Team 2</td><td class="has-text-align-right" data-align="right">-3</td><td>$15,000</td><td>3/4/1999</td><td>2 January 2026</td></tr><tr><td>alpha united</td><td class="has-text-align-right" data-align="right">12</td><td></td><td>2010-12-31</td><td>Feb 1, 2026</td></tr><tr><td>Zebra</td><td class="has-text-align-right" data-align="right">0</td><td>$80</td><td>2024-01-05</td><td>Dec 24, 2025</td></tr></tbody><tfoot><tr><td>Total</td><td class="has-text-align-right" data-align="right">28</td><td>$17,230.50</td><td></td><td></td></tr></tfoot></table></figure>
<!-- /wp:table -->
HTML;

$merged = <<<'HTML'
<!-- wp:table {"hasFixedLayout":true,"sortable":true} -->
<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Name</th><th>Score</th></tr></thead><tbody><tr><td colspan="2">Group A</td></tr><tr><td>Bea</td><td>3</td></tr><tr><td>Ann</td><td>9</td></tr></tbody></table></figure>
<!-- /wp:table -->
HTML;

$headless = <<<'HTML'
<!-- wp:table {"hasFixedLayout":true,"sortable":true} -->
<figure class="wp-block-table"><table class="has-fixed-layout"><tbody><tr><td>B</td><td>2</td></tr><tr><td>A</td><td>1</td></tr></tbody></table></figure>
<!-- /wp:table -->
HTML;

$plain = <<<'HTML'
<!-- wp:table {"hasFixedLayout":true} -->
<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Name</th><th>Score</th></tr></thead><tbody><tr><td>Bea</td><td>3</td></tr><tr><td>Ann</td><td>9</td></tr></tbody></table></figure>
<!-- /wp:table -->
HTML;

$menu = <<<'HTML'
<!-- wp:table {"hasFixedLayout":true,"className":"is-style-stripes","sortable":true,"searchable":true,"downloadable":true,"phoneCards":true,"shareLinks":true,"rowsShown":5} -->
<figure class="wp-block-table is-style-stripes"><table class="has-fixed-layout"><thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Added</th></tr></thead><tbody><tr><td>Café Latte</td><td>Drinks</td><td>€4,50</td><td>2026-01-12</td></tr><tr><td>Espresso</td><td>Drinks</td><td>€2,20</td><td>2025-11-03</td></tr><tr><td>Croissant</td><td>Bakery</td><td>€3,10</td><td>2026-02-28</td></tr><tr><td>Örnek Simit</td><td>Bakery</td><td>€1,50</td><td>2024-06-15</td></tr><tr><td>Cheesecake</td><td>Desserts</td><td>€5,90</td><td>2025-12-01</td></tr><tr><td>Iced Tea</td><td>Drinks</td><td>€3,40</td><td>2026-03-09</td></tr><tr><td>Brownie</td><td>Desserts</td><td>€3,80</td><td>2025-09-20</td></tr><tr><td>Bagel</td><td>Bakery</td><td>€2,70</td><td>2026-01-30</td></tr></tbody></table><figcaption class="wp-element-caption">Café menu</figcaption></figure>
<!-- /wp:table -->
HTML;

$long = <<<'HTML'
<!-- wp:table {"hasFixedLayout":true,"sortable":true,"stickyHeader":true,"phoneCards":true} -->
<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>City</th><th>Score</th><th>Visited</th></tr></thead><tbody><tr><td>Amsterdam</td><td>3</td><td>2000-01-10</td></tr><tr><td>Berlin</td><td>40</td><td>2007-02-11</td></tr><tr><td>Cairo</td><td>77</td><td>2014-03-12</td></tr><tr><td>Dubai</td><td>17</td><td>2021-04-13</td></tr><tr><td>Edinburgh</td><td>54</td><td>2002-05-14</td></tr><tr><td>Florence</td><td>91</td><td>2009-06-15</td></tr><tr><td>Geneva</td><td>31</td><td>2016-07-16</td></tr><tr><td>Helsinki</td><td>68</td><td>2023-08-17</td></tr><tr><td>Istanbul</td><td>8</td><td>2004-09-18</td></tr><tr><td>Jeddah</td><td>45</td><td>2011-01-10</td></tr><tr><td>Kraków</td><td>82</td><td>2018-02-11</td></tr><tr><td>Lisbon</td><td>22</td><td>2025-03-12</td></tr><tr><td>Madrid</td><td>59</td><td>2006-04-13</td></tr><tr><td>Nice</td><td>96</td><td>2013-05-14</td></tr><tr><td>Oslo</td><td>36</td><td>2020-06-15</td></tr><tr><td>Paris</td><td>73</td><td>2001-07-16</td></tr><tr><td>Quebec</td><td>13</td><td>2008-08-17</td></tr><tr><td>Riyadh</td><td>50</td><td>2015-09-18</td></tr><tr><td>Seville</td><td>87</td><td>2022-01-10</td></tr><tr><td>Toronto</td><td>27</td><td>2003-02-11</td></tr><tr><td>Utrecht</td><td>64</td><td>2010-03-12</td></tr><tr><td>Vienna</td><td>4</td><td>2017-04-13</td></tr><tr><td>Warsaw</td><td>41</td><td>2024-05-14</td></tr><tr><td>Zürich</td><td>78</td><td>2005-06-15</td></tr><tr><td>Abu Dhabi</td><td>18</td><td>2012-07-16</td></tr><tr><td>Boston</td><td>55</td><td>2019-08-17</td></tr><tr><td>Chicago</td><td>92</td><td>2000-09-18</td></tr><tr><td>Doha</td><td>32</td><td>2007-01-10</td></tr><tr><td>Lyon</td><td>69</td><td>2014-02-11</td></tr><tr><td>Munich</td><td>9</td><td>2021-03-12</td></tr><tr><td>Naples</td><td>46</td><td>2002-04-13</td></tr><tr><td>Porto</td><td>83</td><td>2009-05-14</td></tr><tr><td>Rome</td><td>23</td><td>2016-06-15</td></tr><tr><td>Sofia</td><td>60</td><td>2023-07-16</td></tr><tr><td>Tallinn</td><td>97</td><td>2004-08-17</td></tr><tr><td>Valencia</td><td>37</td><td>2011-09-18</td></tr><tr><td>Zagreb</td><td>74</td><td>2018-01-10</td></tr><tr><td>Austin</td><td>14</td><td>2025-02-11</td></tr><tr><td>Denver</td><td>51</td><td>2006-03-12</td></tr><tr><td>Muscat</td><td>88</td><td>2013-04-13</td></tr></tbody></table></figure>
<!-- /wp:table -->
HTML;

$plain_only = "<!-- wp:paragraph --><p>No sortable table here.</p><!-- /wp:paragraph -->\n" . $plain;

wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Tables',
		'post_name'    => 'tables',
		'post_content' => $league . "\n\n" . $merged . "\n\n" . $headless . "\n\n" . $plain . "\n\n" . $menu . "\n\n" . $long,
	)
);
wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Plain',
		'post_name'    => 'plain',
		'post_content' => $plain_only,
	)
);

/*
 * /sort-tests/: one sortable table per case in sort-cases.json that runs on an English page. Sort the
 * Value column; the Expected column then reads 1, 2, 3..., then "text n", then "last".
 * verify/sort-check.js checks them all.
 */
$sort_cases = json_decode( file_get_contents( __DIR__ . '/sort-cases.json' ), true );
$sort_page  = "<!-- wp:paragraph -->\n<p>Sort the Value column of any table. The Expected column then reads 1, 2, 3, then \"text\" rows, then \"last\" rows.</p>\n<!-- /wp:paragraph -->";
foreach ( $sort_cases as $case ) {
	if ( isset( $case['lang'] ) && 'en-US' !== $case['lang'] ) {
		continue;
	}
	$rows = '';
	foreach ( $case['cells'] as $cell ) {
		$kind     = isset( $cell[2] ) ? $cell[2] : 'v';
		$expected = 'e' === $kind ? 'last' : ( 'o' === $kind ? 'text ' . $cell[1] : (string) $cell[1] );
		$rows    .= '<tr><td>' . esc_html( $cell[0] ) . '</td><td>' . esc_html( $expected ) . '</td></tr>';
	}
	$sort_page .= "\n\n<!-- wp:heading {\"level\":3} -->\n<h3 class=\"wp-block-heading\">" . esc_html( $case['title'] ) . "</h3>\n<!-- /wp:heading -->";
	$sort_page .= "\n\n<!-- wp:table {\"hasFixedLayout\":true,\"sortable\":true} -->\n<figure class=\"wp-block-table\"><table class=\"has-fixed-layout\"><thead><tr><th>Value</th><th>Expected</th></tr></thead><tbody>" . $rows . "</tbody></table></figure>\n<!-- /wp:table -->";
}
wp_insert_post(
	array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => 'Sort tests',
		'post_name'    => 'sort-tests',
		'post_content' => $sort_page,
	)
);
