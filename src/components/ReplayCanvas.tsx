import React, { useRef, useEffect, useContext } from 'react';
import './ReplayViewport.css'
import { ReplayContext } from '../context';
import { PanEvent, PanLocation, PanDrawable, Notification, getScanOutDescription, PanEventType, getCookTimeForProtein, getPanName, Machine, getTimeUntilPanExpires, getTimeUntilMachineDone } from '../types';

import hennyBase from '../assets/henny_base.png';
import hennyBaseOpen from '../assets/henny_base_open.png';
import kanban from '../assets/kanban.png';
import kanban_expired from '../assets/kanban_expired.png';
import spindle from '../assets/spindle.png';
import shelf from '../assets/shelf.png';
import funnel from '../assets/funnel.png';
import timer from '../assets/timer.png';
import { interpolatePositions } from '../math';

const ReplayCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const canvasWidth = 2400;
    const canvasHeight = 986;

    const renderOffsetX = 125;

    const context = useContext(ReplayContext);
    
    const executedEvents = useRef<PanEvent[]>([]);
    const virtualPans = useRef<PanDrawable[]>([]);
    const virtualPanQueueXPositions = useRef<number[]>([]);
    const virtualMachines = useRef<Machine[]>([]);
    const notifications = useRef<Notification[]>([]);
    const currentBreader = useRef<string>("None");

    if (context) {
        context.renderEvent = () => {renderCanvas()};
        context.jumpToFrame = calculateStateFromStartToFrame;
        context.initVirtualPans = initPans;
    }

    // load image assets
    const images = useRef<{ [key: string]: HTMLImageElement }>({});
    useEffect(() => {
        console.log("Loading assets...");
        const cae = new FontFace('CaeciliaCom', "url(assets/caeciliacom-bold.ttf)");
        const ape = new FontFace('Apercu', "url(assets/caeciliacom-bold.ttf)");
        cae.load().then(() => {
            document.fonts.add(cae);
        });
        ape.load().then(() => {
            document.fonts.add(ape);
        });

        const imageAssets = [hennyBase, hennyBaseOpen, kanban, kanban_expired, spindle, shelf, funnel, timer];
        const loadImagesAsBase64 = async () => {
            const promises = imageAssets.map((src) => {
                return fetch(src)
                    .then((response) => response.blob())
                    .then((blob) => {
                        return new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                    });
            });

            const base64Images = await Promise.all(promises);
            imageAssets.forEach((src, index) => {
                const img = new Image();
                img.src = base64Images[index];
                images.current[src] = img;
            });

            console.log("Assets loaded");
        };

        loadImagesAsBase64();
    }, []);

    function initPans() {
        if (context) {
            const width = 160;
            const spacing = 0; // Add spacing between pans
            const panCount = context.pans?.length || 0;

            const totalWidth = panCount * width + (panCount - 1) * spacing;

            virtualPanQueueXPositions.current = [];
            virtualPans.current = context?.pans?.map((pan, index) => ({
                pan: pan,
                x: (canvasWidth/2 - totalWidth/2) + index * (width + spacing),
                start_x: (canvasWidth/2 - totalWidth/2) + index * (width + spacing),
                y: 74,
                next_x: 0,
                next_y: 0,
            })) || [];
            
            virtualPans.current.forEach((pan) => {
                pan.pan.pan_location = PanLocation.Queue;
                virtualPanQueueXPositions.current.push(pan.x);
            });

            virtualMachines.current = [];
            // fill machines with 6 states
            for(let i = 0; i < 6; i++) {
                virtualMachines.current.push({
                    cooking: false,
                    cooking_protein: undefined,
                    open_mode: ((i < 3) ? context.spicyLeftSide : !context.spicyLeftSide),
                });
            }

            notifications.current = [];
            executedEvents.current = [];
        }
    }

    function handleEvent(pan: PanDrawable, event: PanEvent, currentFrame: number) {
        if(!context) return console.log("Replay data is undefined");

        if(executedEvents.current.find(e => e.event_type === event.event_type && e.timestamp === event.timestamp)) return; // Skip if already executed

        // get current sim time
        const currentSimulationTime = new Date(context.startTime.getTime() + currentFrame * 1000);
        if (pan) {
            switch (event.event_type) {
                case 'start':
                    pan.next_x = pan.start_x;
                    pan.next_y = 804;
                    pan.pan.pan_location = PanLocation.Holding;
                    pan.pan.expire_date = new Date(currentSimulationTime.getTime() + 20 * 60 * 1000); // Set expire date to 20 minutes from now
                    currentBreader.current = event.pan_cycle.breader_id;
                    break;
                case 'fill': {

                    if(context.useBreadingQueue) {
                        const panIndex = virtualPanQueueXPositions.current.findIndex(x => x === pan.x);
                        if(panIndex !== -1) {
    
                            const pansInQueue = virtualPans.current
                                .filter(p => p.pan.pan_location === PanLocation.Queue)
                                .sort((a, b) => a.x - b.x);
    
                            // shift pans in queue to the left
                            for(let i = panIndex + 1; i < pansInQueue.length; i++) {
    
                                const actualIndex = virtualPans.current.findIndex(p => p.pan.protein_pan === pansInQueue[i].pan.protein_pan);
    
                                virtualPans.current[actualIndex].next_x = virtualPanQueueXPositions.current[i - 1];
                                virtualPans.current[actualIndex].next_y = 74;
                                virtualPans.current[actualIndex].animation_start_frame = Math.floor(context.timelinePosition);
                                virtualPans.current[actualIndex].animation_end_frame = Math.floor(context.timelinePosition) + 4;
    
                                console.log("Shifting pan", virtualPans.current[actualIndex].pan.protein_pan, "to", i);
                            }
                        }
                    }

                    pan.next_y = 580;
                    pan.next_x = canvasWidth/2 - 80; // funnel x position
                    pan.pan.pan_location = PanLocation.Funnel;

                    // find machine for this pan
                    const machineIndex = virtualMachines.current.findIndex(m => m.cooking_protein?.protein_pan === pan.pan.protein_pan);
                    if(machineIndex === -1) {
                        console.log("No machine for pan", pan.pan.protein_pan);
                        return;
                    }
                    // set the machine to cooking
                    virtualMachines.current[machineIndex].cooking = false;
                    virtualMachines.current[machineIndex].cooking_protein = undefined;

                    // shift breading queue to the left
                    // get index of the pan in the queue from x value

                    break;
                }
                case 'cook': {
                    
                    // if pan protein is already cooking, skip
                    const existingMachineIndex = virtualMachines.current.findIndex(m => m.cooking_protein?.protein_pan === pan.pan.protein_pan);
                    if(existingMachineIndex !== -1) {
                        return;
                    }

                    // determine if the pan is spicy
                    const isSpicy = pan.pan.protein_pan.toLowerCase().includes('spicy');
                    
                    // find first available machine
                    const machineIndex = virtualMachines.current.findIndex(m => m.cooking === false && m.open_mode === isSpicy);
                    if(machineIndex === -1) {
                        console.log("No available machine for pan", pan.pan.protein_pan);
                        return;
                    }
                    // set the machine to cooking
                    virtualMachines.current[machineIndex].cooking = true;
                    virtualMachines.current[machineIndex].cooking_protein = pan.pan;
                    virtualMachines.current[machineIndex].cooking_finish_time = new Date(currentSimulationTime.getTime() + (getCookTimeForProtein(pan.pan)) * 1000);

                    break;
                }
                case 'stop': { 
                    pan.next_y = 74;
                    
                    // get pans in queue
                    const pansInQueue = virtualPans.current.filter(p => p.pan.pan_location === PanLocation.Queue);
                    console.log(pansInQueue);
                    // set next x position to the last x position of the queue
                    pan.next_x = context.useBreadingQueue ? virtualPanQueueXPositions.current[pansInQueue.length] : pan.start_x;

                    pan.pan.pan_location = PanLocation.Queue;
                    break; 
                }
            }
            // Check if the event is already in the notifications
            const isAlreadyNotified = notifications.current.some(notification => notification.message === getEventNotificationString(event));
            if (isAlreadyNotified) return; // Skip if already notified

            notifications.current.push({
                message: getEventNotificationString(event),
                duration: 600, // Duration in frames,
                data: event,
            });

            
            executedEvents.current.push(event);
        }
    }

    function calculateStateFromStartToFrame(frame: number) {
        const process: Promise<void> = new Promise((resolve) => {
            if(!context) return console.log("Replay data is undefined");
            if(!context.replayData) return console.log("Replay data is undefined");
            if(!context.keyframeData) return console.log("Keyframe data is undefined");
            if(!context.pans) return console.log("Pans data is undefined");
            let startFrame = 0;
    
            // if we are before the desired frame, start from our current position, otherwise start from the beginning
            if(context.timelinePosition < frame) {
                startFrame = Math.floor(context.timelinePosition);
            } else {
                startFrame = 0;
                initPans();
            }
    
            // loop through all frames until the desired frame
            for(let i = startFrame; i < frame; i++) {
                const keyframe = context.keyframeData?.keyframes[i];
                // for each event
                keyframe.events.forEach((event: PanEvent) => {
                    const pan = virtualPans.current.find(p => p.pan.protein_pan === event.pan_cycle.protein_pan);
    
                    if(!pan) return console.log("Pan not found", event.pan_cycle.protein_pan);
                    handleEvent(pan, event, i);
    
                    // evaluate the "next" state of all pans
                    virtualPans.current.forEach((pan) => {
                        if(pan.next_x > 0 || pan.next_y > 0) {
                            pan.x = pan.next_x;
                            pan.y = pan.next_y;
                            pan.next_x = 0;
                            pan.next_y = 0;
                        }
                    });
                });
                
                // remove 1 duration
                notifications.current.forEach((notification) => {
                    notification.duration -= 1; // Decrease duration
                    if(notification.duration <= 0) {
                        notifications.current.splice(notifications.current.indexOf(notification), 1); // Remove expired notification
                    }
                });
            }
            resolve();
        });

        process.then(() => {
            
            // if current animation, cancel
            if(animationID.current) {
                cancelAnimationFrame(animationID.current);
                animationID.current = null;
            }
            renderCanvas();
        });
    }

    const animationID = useRef<number | null>(null);
    function renderCanvas() {
        
        if(!context) return console.log("Replay data is undefined");
        if(!context.replayData) return console.log("Replay data is undefined"); 
        if(!context.keyframeData) return console.log("Keyframe data is undefined");
        if(!context.pans) return console.log("Pans data is undefined");

        // wait for images to load, try again in 100ms if not loaded yet
        if(!images.current[kanban]) {
            console.log("Images not loaded yet, trying again in 100ms...");
            setTimeout(() => {
                renderCanvas();
            }, 100);
            return;
        }

        const keyframe = context.keyframeData?.keyframes[Math.floor(context.timelinePosition)];

        const animationDuration = 4; // Animation duration in frames
        
        // for each event
        keyframe.events.forEach((event: PanEvent) => {
            const pan = virtualPans.current.find(p => p.pan.protein_pan === event.pan_cycle.protein_pan);
            if(!pan) return console.log("Pan not found", event.pan_cycle.protein_pan);
            handleEvent(pan, event, context.timelinePosition);
            pan.animation_start_frame = Math.floor(context.timelinePosition);
            pan.animation_end_frame = Math.floor(context.timelinePosition) + animationDuration;
        });

        // get current sim time
        const simulationTime = new Date(context.startTime.getTime() + context.timelinePosition * 1000);

        renderScene(virtualPans.current, simulationTime);
        
        // At the end of the animation, set all the pans' next values to the real deal
        virtualPans.current.forEach((pan) => {
            if(!pan.animation_end_frame || !pan.animation_start_frame) return;

            const t = Math.min(1, (context.timelinePosition - pan.animation_start_frame) / (pan.animation_end_frame - pan.animation_start_frame));
            if(t >= 1) {
                if(pan.next_x > 0)
                    pan.x = pan.next_x;
                pan.next_x = 0;
                if(pan.next_y > 0)
                    pan.y = pan.next_y;
                pan.next_y = 0;

                pan.animation_start_frame = undefined;
                pan.animation_end_frame = undefined;
            }
        });
    }

    function getEventNotificationString(event: PanEvent): string {
        switch (event.event_type) {
            case 'start':
                return `${getPanName(event.pan_cycle, false)} scanned in`;
            case 'fill':
                return `${getPanName(event.pan_cycle, false)} walking`;
            case 'cook':
                return `${getPanName(event.pan_cycle, false)} are cooking`;
            case 'stop':
                return `${getPanName(event.pan_cycle, false)} scanned out ${getScanOutDescription(event.pan_cycle.tzi_target_zone)}`;
            default:
                return 'Unknown event';
        }
    }

    function renderScene(pans: PanDrawable[], simulationTime: Date) {
        if(!context) return console.log("Replay data is undefined");
        const drawKanban = (ctx2D: CanvasRenderingContext2D, pan: PanDrawable) => {
            if(!context) return console.log("Replay data is undefined");

            if (ctx2D) {
    
                // Draw the kanban image
                let img;
                
                
                const width = 160;
                let t = 0;
                if(pan.animation_end_frame && pan.animation_start_frame)
                    t = Math.min(1, (context.timelinePosition - pan.animation_start_frame) / (pan.animation_end_frame - pan.animation_start_frame));

                if (pan.pan.pan_location === PanLocation.Holding) {
                    const isExpired = simulationTime.getTime() >= pan.pan.expire_date.getTime();
                    img = isExpired ? images.current[kanban_expired] : images.current[kanban];
                    ctx2D.fillStyle = isExpired ? 'white' : '#2e4c66';
                } else {
                    img = images.current[kanban];
                    ctx2D.fillStyle = '#2e4c66';
                }
    
                // set font
                ctx2D.font = '20px CaeciliaCom';
                
                if(pan.next_x > 0 || pan.next_y > 0) {
                    ctx2D.drawImage(img, renderOffsetX + interpolatePositions(pan.x, pan.next_x, t), interpolatePositions(pan.y, pan.next_y, t), width, 100); // Example size and position
                    ctx2D.textAlign = 'center';
                    ctx2D.textBaseline = 'middle';
                    ctx2D.fillText(
                        getPanName(pan.pan),
                        renderOffsetX + interpolatePositions(pan.x, pan.next_x, t) + width / 2,
                        interpolatePositions(pan.y, pan.next_y, t) + 36
                    ); // Centered text position
    
                    // set font
                    ctx2D.font = '28px CaeciliaCom';
                    if(pan.pan.pan_location === PanLocation.Holding) {
                        const expireString = getTimeUntilPanExpires(pan.pan, simulationTime);
                        ctx2D.fillText(
                            expireString,
                            renderOffsetX + interpolatePositions(pan.x, pan.next_x, t) + width / 2,
                            interpolatePositions(pan.y, pan.next_y, t) + 64 // Adjusted position for the second line
                        );
                    }
                } else {
                    ctx2D.drawImage(img, renderOffsetX + pan.x, pan.y, width, 100); // Example size and position
                    ctx2D.textAlign = 'center';
                    ctx2D.textBaseline = 'middle';
                    ctx2D.fillText(
                        getPanName(pan.pan),
                        renderOffsetX + pan.x + width / 2,
                        pan.y + 36
                    ); // Centered text position
    
                    const expireString = getTimeUntilPanExpires(pan.pan, simulationTime);
                    // set font
                    ctx2D.font = '28px CaeciliaCom';
                    if(pan.pan.pan_location === PanLocation.Holding) {
                        ctx2D.fillText(
                            expireString,
                            renderOffsetX + pan.x + width / 2,
                            pan.y + 64 // Adjusted position for the second line
                        );
                    }
                }
                ctx2D.fillStyle = '#e2e2e2';
            }
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx2D = canvas.getContext('2d');
            if (ctx2D) {
                // Clear the canvas
                ctx2D.fillStyle = '#e2e2e2';
                ctx2D.fillRect(0, 0, canvas.width, canvas.height);

                ctx2D.drawImage(images.current[shelf], renderOffsetX + canvas.width / 2 - 674, 164, 1348, 20); // Draw shelf image
                ctx2D.drawImage(images.current[funnel], renderOffsetX + canvas.width / 2 - 124, 480, 248, 112); // Draw funnel image

                // draw hennies

                // loop 6 times with a big gap between the first 3 and the second 3
                const hennySpacing = 0;
                const hennyGap = 200; // Big gap between the first 3 and the second 3
                const hennyStartX = canvas.width / 2 - (6 * 200 + 5 * hennySpacing + hennyGap) / 2;
                for (let i = 0; i < virtualMachines.current.length; i++) {
                    const gapOffset = i >= 3 ? hennyGap : 0; // Add gap offset for the second group
                    const x = hennyStartX + i * (hennyGap + hennySpacing) + gapOffset;

                    if(virtualMachines.current[i].open_mode) {
                        ctx2D.drawImage(images.current[hennyBaseOpen], renderOffsetX + x, 260, 200, 428); // Draw henny base
                    } else {

                        ctx2D.drawImage(images.current[virtualMachines.current[i].cooking ? hennyBase : hennyBaseOpen], renderOffsetX + x, 260, 200, 428); // Draw henny base
                        
                        if(virtualMachines.current[i].cooking)
                            ctx2D.drawImage(images.current[spindle], renderOffsetX + x + 100 - 74.5, 260 + 214 - 54, 148, 148); // Draw henny spindle
                    }

                    if(virtualMachines.current[i].cooking) {
                        ctx2D.font = '20px CaeciliaCom';
                        ctx2D.fillStyle = '#2e4c66';
                        ctx2D.textAlign = 'center';
                        
                        // draw timer over machine
                        ctx2D.drawImage(images.current[timer], renderOffsetX + x, 264, 200, 100); // Draw timer image
                        ctx2D.fillText(
                            virtualMachines.current[i].cooking_protein?.protein_name.toUpperCase() || "Unknown",
                            renderOffsetX + x + 100,
                            300 // Adjusted position for the timer text
                        );

                        ctx2D.font = '28px CaeciliaCom';
                        const cookString = getTimeUntilMachineDone(virtualMachines.current[i], simulationTime);
                        ctx2D.fillText(
                            cookString,
                            renderOffsetX + x + 100,
                            328 // Adjusted position for the timer text
                        );
                    }
                }

                // Draw notifications
                notifications.current.slice().reverse().forEach((notification, index) => {

                    ctx2D.fillStyle = '#2e4c66'; 
                    if (notification.data.event_type === PanEventType.Stop) {
                        const event = notification.data as PanEvent;
                        
                        // set color based on TargetZone
                        switch (event.pan_cycle.tzi_target_zone) {
                            case 0:
                                ctx2D.fillStyle = '#dd0031'; // Too Little
                                break;
                            case 1:
                                ctx2D.fillStyle = '#d99a3d'; // Slightly Too Little (darkened for better contrast)
                                break;
                            case 2:
                                ctx2D.fillStyle = '#249e6b'; // On Target
                                break;
                            case 3:
                                ctx2D.fillStyle = '#d99a3d'; // Slightly Too Much
                                break;
                            case 4:
                                ctx2D.fillStyle = '#dd0031'; // Too Much
                                break;
                            default:
                                ctx2D.fillStyle = '#2e4c66'; // Unknown
                        }
                    }

                    ctx2D.font = 'bold 24px Apercu';
                    ctx2D.textAlign = 'left';

                    // Add scan date before the notification message
                    const scanDate = notification.data.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    ctx2D.fillText(
                        `${notification.message}`,
                        172 + 20, // Add spacing for the dash
                        45 + index * 40 // Adjusted position for each notification
                    );

                    ctx2D.fillStyle = '#2e4c66'; // Set color for scan date
                    ctx2D.fillText(
                        scanDate,
                        30,
                        45 + index * 40 // Adjusted position for each notification
                    );

                    
                    notification.duration -= 0.25; // Decrease duration
                    if(notification.duration <= 0) {
                        notifications.current.splice((notifications.current.length - 1) - index, 1); // Remove expired notification
                    }
                });

                ctx2D.fillStyle = '#2e4c66';
                ctx2D.font = 'bold 32px Apercu';
                ctx2D.textAlign = 'right';
                ctx2D.fillText(
                    ` Breader: ${currentBreader.current.length > 0 ? currentBreader.current : ""}` + ` - #${context?.replayData?.location_id}`,
                    canvas.width - 30,
                    50 // Adjusted position for each notification
                );
                ctx2D.textAlign = 'left';
                const timeString = simulationTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                const [time, period] = timeString.split(' '); // Split time and AM/PM
                ctx2D.fillText(
                    time,
                    canvas.width - 212,
                    100 // Adjusted position for each notification
                );
                ctx2D.textAlign = 'right';
                ctx2D.fillText(
                    period,
                    canvas.width - 30, // Slightly offset for AM/PM
                    100 // Same vertical position
                );

                ctx2D.fillText(
                    `${context?.replayData?.date.toLocaleDateString('en-US')}`,
                    canvas.width - 30,
                    150 // Adjusted position for the second line
                );

                // Draw each pan
                pans.forEach((panD) => {
                    drawKanban(ctx2D, panD);
                });
            }
        }
    }

    return (
        <>
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className='replay-canvas'
            />
        </>
    );
};

export default ReplayCanvas;