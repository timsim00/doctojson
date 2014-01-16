<?php

// init the resource
$ch = curl_init();
 
curl_setopt_array(
    $ch, array( 
    CURLOPT_URL => $_GET['p'],
    CURLOPT_RETURNTRANSFER => true
));
 
$output = curl_exec($ch);
curl_close($ch);
echo $output;
?>