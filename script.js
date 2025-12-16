const anim = document.getElementById('anim');
const circle = document.getElementById('circle');
const eventTableBody = document.querySelector('#event-table tbody');

const playBtn = document.getElementById('play_main'); 
const closeBtn = document.getElementById('close'); 
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const reloadBtn = document.getElementById('reload');

const originalBlock3 = document.getElementById('original-block3');
const originalColumn = document.getElementById('original-column');
const workBlock = document.getElementById('work');

let animationId = null;
let eventCounter = 0;
let localEvents = []; 
const CIRCLE_RADIUS = 15;
let speed = 10; 
let currentStep = 1;                  
let directionIndex = 0;                
let stepsTakenInCurrentDirection = 0;  

const directions = [
    { dx: -1, dy: 0, name: 'ліво' },
    { dx: 0, dy: 1, name: 'вниз' },
    { dx: 1, dy: 0, name: 'право' },
    { dx: 0, dy: -1, name: 'вгору' }
];

function logEvent(eventName, serverUrl = 'log.php') {
    eventCounter++;
    const localTime = new Date().toISOString();
    const step = currentStep;

    const eventData = { id: eventCounter, event: eventName, local_time: localTime, step: step };

    fetch(serverUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...eventData, method: 'immediate' }) })
    .then(response => response.json())
    .then(data => { updateTable(eventName, localTime, data.server_time || 'N/A'); })
    .catch(error => { console.error('Помилка негайної відправки:', error); updateTable(eventName, localTime, 'Error'); });

    localEvents.push({ ...eventData, storage_time: localTime });
    localStorage.setItem('accumulatedEvents', JSON.stringify(localEvents));
}

function updateTable(eventName, localTime, serverTime) {
    const newRow = eventTableBody.insertRow();
    newRow.insertCell().textContent = eventName;
    newRow.insertCell().textContent = new Date(localTime).toLocaleTimeString('uk-UA', { hour12: false });
    newRow.insertCell().textContent = serverTime.split(' ')[1] || 'N/A'; 
}

function animate() {
    if (!circle) return;

    const rect = anim.getBoundingClientRect();
    const animWidth = rect.width;
    const animHeight = rect.height;

    let currentX = parseFloat(circle.style.left) * animWidth / 100 || animWidth / 2;
    let currentY = parseFloat(circle.style.top) * animHeight / 100 || animHeight / 2;

    const direction = directions[directionIndex];

    let newX = currentX + direction.dx * speed; 
    let newY = currentY + direction.dy * speed; 

    const hitBoundary = (
        newX < CIRCLE_RADIUS || 
        newX > animWidth - CIRCLE_RADIUS ||
        newY < CIRCLE_RADIUS || 
        newY > animHeight - CIRCLE_RADIUS
    );
    const isExit = (
        newX < -CIRCLE_RADIUS || 
        newX > animWidth + CIRCLE_RADIUS ||
        newY < -CIRCLE_RADIUS || 
        newY > animHeight + CIRCLE_RADIUS
    );

    if (hitBoundary || isExit) {
        cancelAnimationFrame(animationId);
        animationId = null;
        logEvent('Animation stopped: Circle hit boundary (Зіткнення/Виліт)');

        stopBtn.style.display = 'none';
        reloadBtn.style.display = 'inline-block'; 
        return;
    }

    circle.style.left = `${(newX / animWidth) * 100}%`;
    circle.style.top = `${(newY / animHeight) * 100}%`;

    stepsTakenInCurrentDirection += speed; 
    if (stepsTakenInCurrentDirection < currentStep) {
        logEvent(`Move, Step ${stepsTakenInCurrentDirection} of ${currentStep} (${direction.name})`);
    } else {
        currentStep += speed; 
        directionIndex = (directionIndex + 1) % directions.length; 
        stepsTakenInCurrentDirection = 0; 
        logEvent(`Cycle complete. New Direction (to ${directions[directionIndex].name}), Next Step size: ${currentStep}`);
    }

    animationId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (animationId) return; 
    logEvent('Start');

    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    reloadBtn.style.display = 'none';

    animate();
}

function stopAnimation() {
    if (!animationId) return;
    cancelAnimationFrame(animationId);
    animationId = null;
    logEvent('Stop');

    stopBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
}

function reloadObject() {
    cancelAnimationFrame(animationId);
    animationId = null;

    circle.style.left = '50%';
    circle.style.top = '50%';
    circle.style.transform = 'translate(-50%, -50%)';

    currentStep = 1;
    directionIndex = 0;
    stepsTakenInCurrentDirection = 0;

    logEvent('Reload');

    reloadBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
}

function closeApp() {
    cancelAnimationFrame(animationId);
    animationId = null;

    const storedEvents = localStorage.getItem('accumulatedEvents');
    if (storedEvents) {
        logEvent('Close & Send LocalStorage Data');
        fetch('log.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: JSON.parse(storedEvents), method: 'localstorage_dump' }) })
        .then(() => {
            localStorage.removeItem('accumulatedEvents');
            localEvents = [];
            const block3Content = document.querySelector('#original-block3 .content');
            if (block3Content) { 
                block3Content.innerHTML = '<h2>Записи подій успішно відправлено на сервер!</h2><p>Дані доступні у файлі events_localstorage.log.</p>'; 
            }
        })
        .catch(error => { console.error('Помилка відправки LocalStorage:', error); });
    } else { logEvent('Close'); }

    workBlock.style.display = 'none';
    originalBlock3.style.display = 'flex';
    originalColumn.style.display = 'flex';
    playBtn.style.display = 'inline-block';
}

function init() {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    reloadBtn.style.display = 'none';

    playBtn.addEventListener('click', () => {
        playBtn.style.display = 'none'; 
        originalBlock3.style.display = 'none';
        originalColumn.style.display = 'none';
        workBlock.style.display = 'flex';
        startBtn.style.display = 'inline-block';

        currentStep = 1;
        directionIndex = 0;
        stepsTakenInCurrentDirection = 0;

        circle.style.left = '50%';
        circle.style.top = '50%';
        circle.style.transform = 'translate(-50%, -50%)';

        logEvent('Play');
    });

    closeBtn.addEventListener('click', closeApp);
    startBtn.addEventListener('click', startAnimation);
    stopBtn.addEventListener('click', stopAnimation);
    reloadBtn.addEventListener('click', reloadObject);
}

document.addEventListener('DOMContentLoaded', init);
