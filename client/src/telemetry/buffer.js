let stageBuffer = [];

export function bufferStage(evt) {
    stageBuffer.push(evt);
}

export function clearBuffer() {
    stageBuffer = [];
}

export function getBuffer() {
return [...stageBuffer];
}