<?php
date_default_timezone_set('Europe/Kyiv');

header('Content-Type: application/json');

$serverTime = date('Y-m-d H:i:s.v');

$logImmediateFile = 'events_immediate.log';
$logLocalStorageFile = 'events_localstorage.log';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (empty($data) || !isset($data['method'])) {
    echo json_encode(['status' => 'error', 'message' => 'Некоректні дані.']);
    exit;
}

$method = $data['method'];
$response = ['status' => 'success', 'server_time' => $serverTime, 'method' => $method];
$logEntry = '';

try {
    if ($method === 'immediate') {
        $id = $data['id'] ?? 'N/A';
        $event = $data['event'] ?? 'N/A';
        $localTime = $data['local_time'] ?? 'N/A';
        $step = $data['step'] ?? 'N/A';
        
        $logEntry = sprintf(
            "| ID: %s | Event: %s | Local: %s | Server: %s | Step: %s |\n",
            $id, $event, $localTime, $serverTime, $step
        );

        file_put_contents($logImmediateFile, $logEntry, FILE_APPEND | LOCK_EX);

    } elseif ($method === 'localstorage_dump' && isset($data['events']) && is_array($data['events'])) {
        
        $events = $data['events'];
        $startTime = $events[0]['storage_time'] ?? 'N/A';
        $endTime = end($events)['storage_time'] ?? 'N/A';
        
        $logEntry .= "--- DUMP START (Server Time): " . $serverTime . " | Local Start: " . $startTime . " | Local End: " . $endTime . " ---\n";
        
        foreach ($events as $eventData) {
            $id = $eventData['id'] ?? 'N/A';
            $event = $eventData['event'] ?? 'N/A';
            $storageTime = $eventData['storage_time'] ?? 'N/A';
            $step = $eventData['step'] ?? 'N/A';
            
            $logEntry .= sprintf(
                "| ID: %s | Event: %s | Local (LS): %s | Step: %s |\n",
                $id, $event, $storageTime, $step
            );
        }
        $logEntry .= "--- DUMP END (Server Time): " . $serverTime . " ---\n\n";

        file_put_contents($logLocalStorageFile, $logEntry, FILE_APPEND | LOCK_EX);
        
    } else {
        $response = ['status' => 'error', 'message' => 'Невідомий метод або відсутні дані.'];
    }
} catch (Exception $e) {
    $response = ['status' => 'error', 'message' => 'Помилка сервера: ' . $e->getMessage()];
}

echo json_encode($response);
?>