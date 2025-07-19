<?php
// Get the request URI and clean it
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request_uri = rtrim($request_uri, '/');

// Only serve static HTML for the exact homepage request
if (
    $request_uri === '' ||           // Root domain
    $request_uri === '/' ||          // Root with slash
    $request_uri === '/index.php'    // Index.php
) {
    // Check if SSO parameter is present
    if (isset($_GET['sso'])) {
        define('WP_USE_THEMES', true);
        require __DIR__ . '/wp-blog-header.php';
    } else {
        // Serve static HTML for normal homepage visits
        $html_content = file_get_contents(__DIR__ . '/index-home.html');
        echo $html_content;
    }
} else {
    // Everything else goes to WordPress
    define('WP_USE_THEMES', true);
    require __DIR__ . '/wp-blog-header.php';
}
?>