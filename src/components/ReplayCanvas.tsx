import React, { useRef, useEffect, useContext } from 'react';
import './ReplayViewport.css'
import { ReplayContext } from '../context';
import { Pan, PanEvent, PanLocation, Keyframe, PanDrawable, PanCycle, getScanOutDescription, PanEventType, getCookTimeForProtein } from '../types';

import hennyBase from '../assets/henny_base.png';
import hennyBaseOpen from '../assets/henny_base_open.png';
import kanban from '../assets/kanban.png';
import kanban_expired from '../assets/kanban_expired.png';
import spindle from '../assets/spindle.png';
import shelf from '../assets/shelf.png';
import funnel from '../assets/funnel.png';
import timer from '../assets/timer.png';

const ReplayCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const replayData = useContext(ReplayContext);

    if (replayData) {
        replayData.renderEvent = () => {renderCanvas()};
        replayData.jumpToFrame = calculateStateFromStartToFrame;
    }

    // load image assets
    const images = useRef<{ [key: string]: HTMLImageElement }>({});
    useEffect(() => {
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
        };

        loadImagesAsBase64();
    }, []);

    // load font assets
    useEffect(() => {
        const cae = new FontFace('CaeciliaCom', "url(assets/caeciliacom-bold.ttf)");
        const ape = new FontFace('Apercu', "url(assets/caeciliacom-bold.ttf)");
        cae.load().then(() => {
            document.fonts.add(cae);
        });
        ape.load().then(() => {
            document.fonts.add(ape);
        });
    }, []);

    function getPanName(input: PanCycle | Pan | undefined, truncate = true): string {
        if (!input) return "Unknown"; // Handle undefined input

        const nameParts = input.protein_pan.split(" ");
        const panNumber = nameParts[nameParts.length - 1]; // Get the last part (pan number)
        const proteinName = input.protein_name.toUpperCase();
        // Truncate protein name "SPICY STRIPS" to "SPICY ST..."
        let truncatedName;

        if(truncate) {
            truncatedName = proteinName.length > 10 ? proteinName.substring(0, 8) + "..." : proteinName;
        } else {
            truncatedName = proteinName;
        }

        return `${truncatedName} ${panNumber}`; // Combine them
    }

    //interpolate positions
    function interpolatePositions(start: number, end: number, fraction: number): number {
        return start + (end - start) * easeInOutCubic(fraction);
    }

    function easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function getTimeUntilPanExpires(pan: Pan, simulationTime: Date) {
        const timeUntilExpire = pan.expire_date.getTime() - simulationTime.getTime();
        const totalSeconds = Math.floor(timeUntilExpire / 1000);
        const clampedSeconds = Math.min(totalSeconds, 20 * 60); // Clamp at 20 minutes (1200 seconds)
        const minutes = Math.floor(clampedSeconds / 60);
        const seconds = Math.abs(clampedSeconds % 60); // Allow negative time
        const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return result;
    }

    function getTimeUntilMachineDone(machine: Machine, simulationTime: Date) {
        if(!machine.cooking_protein) return "Unknown";
        if(!machine.cooking_finish_time) return "Unknown";

        // get finish 
        const timeUntilFill = machine.cooking_finish_time?.getTime() - simulationTime.getTime();

        const totalSeconds = Math.floor(timeUntilFill / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.abs(totalSeconds % 60);
        const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return result;
    }

    const pans = useRef<PanDrawable[]>([]);

    function initPans() {
        if (replayData) {
            const width = 80;
            const spacing = 0; // Add spacing between pans
            const panCount = replayData.pans?.length || 0;

            const totalWidth = panCount * width + (panCount - 1) * spacing;

            pans.current = replayData?.pans?.map((pan, index) => ({
                pan: pan,
                x: (400 - totalWidth/2) + index * (width + spacing),
                start_x: (400 - totalWidth/2) + index * (width + spacing),
                y: 75,
                next_pan: {
                    ...pan
                },
                next_x: 0,
                next_y: 0,
            })) || [];
            
            pans.current.forEach((pan) => {
                pan.pan.pan_location = PanLocation.Queue;
            });

            machines.current = [];
            // fill machines with 6 states
            for(let i = 0; i < 6; i++) {
                machines.current.push({
                    cooking: false,
                    cooking_protein: undefined,
                    open_mode: ((i<3) ? true : false),
                });
            }
        }
    }

    useEffect(() => {
        initPans();
    }, [replayData?.pans]);

    function handleEvent(pan: PanDrawable, event: PanEvent, currentFrame: number) {
        if(!replayData) return console.log("Replay data is undefined");

        // get current sim time
        const currentSimulationTime = new Date(replayData.startTime.getTime() + currentFrame * 1000);
        if (pan) {
            switch (event.event_type) {
                case 'start':
                    pan.next_x = pan.start_x;
                    pan.next_y = 450;
                    pan.pan.pan_location = PanLocation.Holding;
                    pan.pan.expire_date = new Date(currentSimulationTime.getTime() + 20 * 60 * 1000); // Set expire date to 20 minutes from now
                    currentBreader.current = event.pan_cycle.breader_id;
                    break;
                case 'fill': {
                    pan.next_y = 290;
                    pan.next_x = 400 - 40; // funnel x position
                    pan.pan.pan_location = PanLocation.Funnel;

                    // find machine for this pan
                    const machineIndex = machines.current.findIndex(m => m.cooking_protein?.protein_pan === pan.pan.protein_pan);
                    if(machineIndex === -1) {
                        console.log("No machine for pan", pan.pan.protein_pan);
                        return;
                    }
                    // set the machine to cooking
                    machines.current[machineIndex].cooking = false;
                    machines.current[machineIndex].cooking_protein = undefined;

                    break;
                }
                case 'cook': {
                    
                    // determine if the pan is spicy
                    const isSpicy = pan.pan.protein_pan.toLowerCase().includes('spicy');
                    
                    // find first available machine
                    const machineIndex = machines.current.findIndex(m => m.cooking === false && m.open_mode === isSpicy);
                    if(machineIndex === -1) {
                        console.log("No available machine for pan", pan.pan.protein_pan);
                        return;
                    }
                    // set the machine to cooking
                    machines.current[machineIndex].cooking = true;
                    machines.current[machineIndex].cooking_protein = pan.pan;
                    machines.current[machineIndex].cooking_finish_time = new Date(currentSimulationTime.getTime() + (getCookTimeForProtein(pan.pan)) * 1000);

                    break;
                }
                case 'stop':
                    pan.next_y = 75;
                    pan.next_x = pan.start_x;
                    pan.pan.pan_location = PanLocation.Queue;
                    break;
            }
        }
    }

    function calculateStateFromStartToFrame(frame: number) {
        const process: Promise<void> = new Promise((resolve) => {
            if(!replayData) return console.log("Replay data is undefined");
            if(!replayData.replayData) return console.log("Replay data is undefined");
            if(!replayData.keyframeData) return console.log("Keyframe data is undefined");
            if(!replayData.pans) return console.log("Pans data is undefined");
    
    
            let startFrame = 0;
    
            
    
            // if we are before the desired frame, start from our current position, otherwise start from the beginning
            if(replayData.timelinePosition < frame) {
                startFrame = Math.floor(replayData.timelinePosition);
            } else {
                startFrame = 0;
                initPans();
            }
    
            // loop through all frames until the desired frame
            for(let i = startFrame; i < frame; i++) {
                const keyframe = replayData.keyframeData?.keyframes[i];
                // for each event
                keyframe.events.forEach((event: PanEvent) => {
                    const pan = pans.current.find(p => p.pan.protein_pan === event.pan_cycle.protein_pan);
    
                    if(!pan) return console.log("Pan not found", event.pan_cycle.protein_pan);
                    handleEvent(pan, event, i);
    
                    // evaluate the "next" state of the pan
                    if(pan.next_x > 0 || pan.next_y > 0) {
                        pan.x = pan.next_x;
                        pan.y = pan.next_y;
                        pan.next_x = 0;
                        pan.next_y = 0;
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
        
        if(!replayData) return console.log("Replay data is undefined");
        if(!replayData.replayData) return console.log("Replay data is undefined"); 
        if(!replayData.keyframeData) return console.log("Keyframe data is undefined");
        if(!replayData.pans) return console.log("Pans data is undefined");

        const keyframe = replayData.keyframeData?.keyframes[Math.floor(replayData.timelinePosition)];
        
        // for each event
        keyframe.events.forEach((event: PanEvent) => {
            const pan = pans.current.find(p => p.pan.protein_pan === event.pan_cycle.protein_pan);
            if(!pan) return console.log("Pan not found", event.pan_cycle.protein_pan);
            handleEvent(pan, event, replayData.timelinePosition);
        });

        // get current sim time
        const simulationTime = new Date(replayData.startTime.getTime() + replayData.timelinePosition * 1000);

        if (keyframe.events.length == 0) {
            renderScene(keyframe.events, pans.current, 0, simulationTime);
        } else {
            const startTime = Date.now();
            const duration = 200; // Animation duration in milliseconds
            const animate = () => {
                const currentTime = Date.now();
                const elapsedTime = currentTime - startTime;
                const t = Math.min(elapsedTime / duration, 1); // Normalize t to [0, 1]
                renderScene(keyframe.events, pans.current, t, simulationTime);
                if (t < 1) {
                    animationID.current = requestAnimationFrame(animate);
                } else {
                    // At the end of the animation, set all the pans' next values to the real deal
                    pans.current.forEach((pan) => {
                        if(pan.next_x > 0)
                            pan.x = pan.next_x;
                        pan.next_x = 0;
                        if(pan.next_y > 0)
                            pan.y = pan.next_y;
                        pan.next_y = 0;
                    });
                }
            };
            animate();
        }
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

    type Notification = {
        message: string;
        duration: number; // Duration in frames
        data: PanEvent;
    };


    type Machine = {
        cooking: boolean;
        cooking_protein: Pan | undefined;
        open_mode: boolean;
        cooking_finish_time?: Date;
    }

    const machines = useRef<Machine[]>([]);

    const notifications = useRef<Notification[]>([]);

    const currentBreader = useRef<string>("None");

    function renderScene(events: PanEvent[], pans: PanDrawable[], t: number = 0, simulationTime: Date) {
        if(!replayData) return console.log("Replay data is undefined");
        const drawKanban = (context: CanvasRenderingContext2D, pan: PanDrawable, t: number) => {
            if(!replayData) return console.log("Replay data is undefined");
            const width = 80;
            if (context) {
    
                // Draw the kanban image
                let img;
                
                if (pan.pan.pan_location === PanLocation.Holding) {
                    const isExpired = simulationTime.getTime() >= pan.pan.expire_date.getTime();
                    img = isExpired ? images.current[kanban_expired] : images.current[kanban];
                    context.fillStyle = isExpired ? 'white' : '#2e4c66';
                } else {
                    img = images.current[kanban];
                    context.fillStyle = '#2e4c66';
                }
    
                // set font
                context.font = '10px CaeciliaCom';
                
                if(pan.next_x > 0 || pan.next_y > 0) {
                    context.drawImage(img, interpolatePositions(pan.x, pan.next_x, t), interpolatePositions(pan.y, pan.next_y, t), width, 50); // Example size and position
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(
                        getPanName(pan.pan),
                        interpolatePositions(pan.x, pan.next_x, t) + width / 2,
                        interpolatePositions(pan.y, pan.next_y, t) + 18
                    ); // Centered text position
    
                    // set font
                    context.font = '14px CaeciliaCom';
                    if(pan.pan.pan_location === PanLocation.Holding) {
                        const expireString = getTimeUntilPanExpires(pan.pan, simulationTime);
                        context.fillText(
                            expireString,
                            interpolatePositions(pan.x, pan.next_x, t) + width / 2,
                            interpolatePositions(pan.y, pan.next_y, t) + 32 // Adjusted position for the second line
                        );
                    }
                } else {
                    context.drawImage(img, pan.x, pan.y, width, 50); // Example size and position
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText(
                        getPanName(pan.pan),
                        pan.x + width / 2,
                        pan.y + 18
                    ); // Centered text position
    
                    const expireString = getTimeUntilPanExpires(pan.pan, simulationTime);
                    // set font
                    context.font = '14px CaeciliaCom';
                    if(pan.pan.pan_location === PanLocation.Holding) {
                        context.fillText(
                            expireString,
                            pan.x + width / 2,
                            pan.y + 32 // Adjusted position for the second line
                        );
                    }
                }
                context.fillStyle = '#e2e2e2';
            }
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                // Clear the canvas
                context.fillStyle = '#e2e2e2';
                context.fillRect(0, 0, canvas.width, canvas.height);

                context.drawImage(images.current[shelf], canvas.width / 2 - 337, 120, 674, 10); // Draw shelf image
                context.drawImage(images.current[funnel], canvas.width / 2 - 62, 240, 124, 56); // Draw funnel image

                // draw hennies

                // loop 6 times with a big gap between the first 3 and the second 3
                const hennySpacing = 0;
                const hennyGap = 100; // Big gap between the first 3 and the second 3
                const hennyStartX = canvas.width / 2 - (6 * 100 + 5 * hennySpacing + hennyGap) / 2;
                for (let i = 0; i < machines.current.length; i++) {
                    const gapOffset = i >= 3 ? hennyGap : 0; // Add gap offset for the second group
                    const x = hennyStartX + i * (100 + hennySpacing) + gapOffset;

                    if(machines.current[i].open_mode) {
                        context.drawImage(images.current[hennyBaseOpen], x, 130, 100, 214); // Draw henny base
                    } else {

                        context.drawImage(images.current[machines.current[i].cooking ? hennyBase : hennyBaseOpen], x, 130, 100, 214); // Draw henny base
                        
                        if(machines.current[i].cooking)
                            context.drawImage(images.current[spindle], x + 50 - 36.5, 130 + 107 - 30, 74, 74); // Draw henny spindle
                    }

                    if(machines.current[i].cooking) {
                        context.font = '10px CaeciliaCom';
                        context.fillStyle = '#2e4c66';
                        context.textAlign = 'center';
                        
                        // draw timer over machine
                        context.drawImage(images.current[timer], x, 132, 100, 50); // Draw timer image
                        context.fillText(
                            machines.current[i].cooking_protein?.protein_name.toUpperCase() || "Unknown",
                            x + 50,
                            140+10 // Adjusted position for the timer text
                        );

                        context.font = '14px CaeciliaCom';
                        const cookString = getTimeUntilMachineDone(machines.current[i], simulationTime);
                        context.fillText(
                            cookString,
                            x + 50,
                            140+25 // Adjusted position for the timer text
                        );
                    }
                }


                // Render notification for each event
                events.forEach((event) => {
                    // Check if the event is already in the notifications
                    const isAlreadyNotified = notifications.current.some(notification => notification.message === getEventNotificationString(event));
                    if (isAlreadyNotified) return; // Skip if already notified

                    notifications.current.push({
                        message: getEventNotificationString(event),
                        duration: 100, // Duration in frames,
                        data: event,
                    });
                });

                // Draw notifications
                notifications.current.forEach((notification, index) => {

                    context.fillStyle = '#2e4c66'; 
                    if (notification.data.event_type === PanEventType.Stop) {
                        const event = notification.data as PanEvent;
                        
                        // set color based on TargetZone
                        switch (event.pan_cycle.tzi_target_zone) {
                            case 0:
                                context.fillStyle = '#dd0031'; // Too Little
                                break;
                            case 1:
                                context.fillStyle = '#ffb549'; // Slightly Too Little
                                break;
                            case 2:
                                context.fillStyle = '#249e6b'; // On Target
                                break;
                            case 3:
                                context.fillStyle = '#ffb549'; // Slightly Too Much
                                break;
                            case 4:
                                context.fillStyle = '#dd0031'; // Too Much
                                break;
                            default:
                                context.fillStyle = '#2e4c66'; // Unknown
                        }
                    }

                    context.font = 'bold 16px Apercu';
                    context.textAlign = 'left';
                    context.fillText(
                        notification.message,
                        30,
                        30 + index * 20 // Adjusted position for each notification
                    );
                    notification.duration -= 1; // Decrease duration
                    if(notification.duration <= 0) {
                        notifications.current.splice(index, 1); // Remove expired notification
                    }
                });

                context.fillStyle = '#2e4c66';
                context.font = 'bold 16px Apercu';
                context.textAlign = 'right';
                context.fillText(
                    ` Breader: ${currentBreader.current.length > 0 ? currentBreader.current : ""}` + ` - #${replayData?.replayData?.location_id}`,
                    canvas.width - 30,
                    30 // Adjusted position for each notification
                );
                context.fillText(
                    `${simulationTime.toLocaleTimeString('en-US', { timeStyle: 'short' })} - ` + `${replayData?.replayData?.date.toLocaleDateString('en-US')}`,
                    canvas.width - 30,
                    50 // Adjusted position for each notification
                );

                // Draw each pan
                pans.forEach((panD) => {
                    drawKanban(context, panD, t);
                });
            }
        }
    }

    return (
        <>
            <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className='replay-canvas'
            />
            
            <button onClick={() => {
                renderCanvas();
            }
            }>Render</button>
        </>
    );
};

export default ReplayCanvas;