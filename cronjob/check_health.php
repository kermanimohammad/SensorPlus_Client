<?php
// check_health.php
// This script pings the health endpoint of your Render app and logs the result.

date_default_timezone_set('America/Toronto');
$url = "https://digitaltwin-sensorplus.onrender.com/health";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
$response = curl_exec($ch);
$error = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$logFile = __DIR__ . "/health_check.log";
$time = date("Y-m-d H:i:s");

if ($error) {
    $msg = "[ERROR] $time - $error\n";
} else {
    $msg = "[OK] $time - HTTP $httpCode\n";
}

// Append log
file_put_contents($logFile, $msg, FILE_APPEND);

// Optional: Keep only last 1000 lines
$lines = file($logFile);
if (count($lines) > 1000) {
    file_put_contents($logFile, implode("", array_slice($lines, -1000)));
}

echo $msg;
?>
