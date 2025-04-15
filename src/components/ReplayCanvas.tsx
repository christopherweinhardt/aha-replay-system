import React, { useRef, useEffect, useContext } from 'react';
import './ReplayViewport.css'
import { ReplayContext } from '../context';
import { Pan, PanEvent, PanLocation, Keyframe, PanDrawable, PanCycle, getScanOutDescription, PanEventType } from '../types';

import hennyBase from '../assets/henny_base.png';
import kanban from '../assets/kanban.png';
import kanban_expired from '../assets/kanban_expired.png';
import spindle from '../assets/spindle.png';

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
        const imageAssets = [hennyBase, kanban, kanban_expired, spindle];
        imageAssets.forEach((src) => {
            const img = new Image();
            img.src = src;
            images.current[src] = img;
        });
    });

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

    function getPanName(input: PanCycle | Pan, truncate = true): string {
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

    const pans = useRef<PanDrawable[]>([]);

    function initPans() {
        if (replayData) {
            const width = 80;
            const spacing = 10; // Add spacing between pans
            pans.current = replayData?.pans?.map((pan, index) => ({
                pan: pan,
                x: 10 + index * (width + spacing),
                y: 150,
                next_pan: {
                    ...pan
                },
                next_x: 0,
                next_y: 0,
            })) || [];
            
            pans.current.forEach((pan, index) => {
                pan.pan.pan_location = PanLocation.Queue;
            });
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
                    pan.next_x = pan.x;
                    pan.next_y = 300;
                    pan.pan.pan_location = PanLocation.Holding;
                    pan.pan.expire_date = new Date(currentSimulationTime.getTime() + 20 * 60 * 1000); // Set expire date to 20 minutes from now
                    break;
                case 'fill':
                    pan.next_y = 250;
                    pan.next_x = pan.x;
                    break;
                case 'cook':
                    pan.next_y = 350;
                    pan.next_x = pan.x;
                    break;
                case 'stop':
                    pan.next_y = 150;
                    pan.next_x = pan.x;
                    pan.pan.pan_location = PanLocation.Queue;
                    break;
            }
        }
    }

    function calculateStateFromStartToFrame(frame: number) {
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
    }

    function renderCanvas() {
        
        if(!replayData) return console.log("Replay data is undefined");
        if(!replayData.replayData) return console.log("Replay data is undefined"); 
        if(!replayData.keyframeData) return console.log("Keyframe data is undefined");
        if(!replayData.pans) return console.log("Pans data is undefined");

        const keyframe = replayData.keyframeData?.keyframes[Math.floor(replayData.timelinePosition)];
        // get current sim time
        const currentSimulationTime = new Date(replayData.startTime.getTime() + replayData.timelinePosition * 1000);

        // for each event
        keyframe.events.forEach((event: PanEvent) => {
            const pan = pans.current.find(p => p.pan.protein_pan === event.pan_cycle.protein_pan);
            if(!pan) return console.log("Pan not found", event.pan_cycle.protein_pan);
            handleEvent(pan, event, replayData.timelinePosition);
        });

        if (keyframe.events.length == 0) {
            renderScene(keyframe.events, pans.current, currentSimulationTime, 0);
        } else {
            const startTime = Date.now();
            const duration = 200; // Animation duration in milliseconds
            const animate = () => {
                const currentTime = Date.now();
                const elapsedTime = currentTime - startTime;
                const t = Math.min(elapsedTime / duration, 1); // Normalize t to [0, 1]
                renderScene(keyframe.events, pans.current, currentSimulationTime, t);
                if (t < 1) {
                    requestAnimationFrame(animate);
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
                return `${getPanName(event.pan_cycle, false)} finished cooking`;
            case 'cook':
                return `${getPanName(event.pan_cycle, false)} is cooking`;
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


    const notifications = useRef<Notification[]>([]);

    function renderScene(events: PanEvent[], pans: PanDrawable[], simulationTime: Date, t: number = 0) {
        const drawKanban = (context: CanvasRenderingContext2D, pan: PanDrawable, simulationTime: Date, t: number) => {
            const width = 80;
            if (context) {
    
                // Draw the kanban image
                let img;
                
                if (pan.pan.pan_location === PanLocation.Holding) {
                    const isExpired = simulationTime.getTime() >= pan.pan.expire_date.getTime();
                    img = isExpired ? images.current[kanban_expired] : images.current[kanban];
                } else {
                    img = images.current[kanban];
                }
    
                // set font
                context.font = '10px CaeciliaCom';
                context.fillStyle = '#2e4c66';
                
                if(pan.next_x > 0 || pan.next_y > 0) {
                    context.drawImage(img, interpolatePositions(pan.x, pan.next_x, t), interpolatePositions(pan.y, pan.next_y, t), width, 50); // Example size and position
                    context.fillStyle = '#2e4c66';
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
                    context.fillStyle = '#2e4c66';
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
            }
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                // Clear the canvas
                context.fillStyle = '#e2e2e2';
                context.fillRect(0, 0, canvas.width, canvas.height);

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


                // Draw each pan
                pans.forEach((panD) => {
                    drawKanban(context, panD, simulationTime, t);
                });
            }
        }
    }

    return (
        <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className='replay-canvas'
            style={{ border: '1px solid #000' }}
        />
    );
};

export default ReplayCanvas;