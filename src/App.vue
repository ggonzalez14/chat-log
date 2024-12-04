<template>
	<div class="app-container">
		<!-- Message Thread Sidebar -->
		<div class="sidebar-container">

			<!-- Message thread header and create new chat button -->
			<div class="title-row">
				<span class="title">Chat Log</span>
				<img src="/src/assets/icons/new-chat.png" class="new-chat-button" @click="createNewChat()"/>
			</div>
			
			<!-- Loop over each message thread in the list and create a message thread element for the sidebar -->
			<!-- Add functionality for clicking on the message thread that will open the correct one and set the -->
			<!-- correct IDs in FileMaker as well, maintaining consistency between the webviewer and FileMaker backend -->
			<div class="chat-log-container">
				<span v-if="messageThreads.length === 0" class="sidebar-placeholder-text">Nothing to Display!</span>
				<span v-for="(chatLog, index) in messageThreads" class="chat-log" @click="openChatLog(index, chatLog.getId())">
					{{ chatLog.getChatTitle() }}
				</span>
			</div>
		</div>

		<!-- Main Chat Window -->
		<div class="chat-window-container">
			<div ref="chatWindow" class="chat-window">

				<!-- Show this if there is no chat history -->
				<span v-if="chatHistory && chatHistory.length === 0" class="placeholder-text">
					Submit a Message!
				</span>

				<!-- Show this as soon as there is any kind of chat history -->
				<div class="chat-bubble-container"
					v-else
					v-for="(chat, index) in chatHistory" 
				>
					<!-- User icon on right side of chat window -->
					<img v-if="chat.role === 'assistant' || chat.role === 'loading' || chat.role === 'mermaid'" src="/src/assets/icons/ai-chat-icon-lightgray.png" class="ai-chat-icon"/>

					<!-- Probably unnecessary if statements, but just in case there is any other user role that is passed in we -->
					<!-- will only display those that are user or AI roles (loading in the case of waiting for AI response) -->
					<span v-if="chat.role === 'assistant' || chat.role === 'user'  || chat.role === 'loading' || chat.role === 'mermaid'"
						:class="chat.role === 'user' ? 'user-chat-bubble' : chat.isMermaid ? 'ai-chat-bubble mermaid-graph-bubble' : 'ai-chat-bubble'"
					>
						<!-- Display bouncing ellipsis animation while waiting on AI response -->
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>

						<!-- Once AI response has been received (or user has submitted a prompt) display this -->
						<span v-if="chat.role === 'user' || ( chat.role === 'assistant' && !chat.isMermaid )" class="ai-response">
							{{ chat.content }}
						</span>

						<!-- Display the mermaid graph if that is what is passed in via the assistant -->
						<pre v-if="chat.isMermaid" :id="'graph-' + index" class="mermaid mermaid-graph" @click="downloadMermaidGraph(index)">
							{{ chat.content }}
						</pre>
					</span>

					<!-- AI icon on left side of chat window -->
					<img v-if="chat.role === 'user'" src="/src/assets/icons/user-chat-icon-lightgray.png" class="user-chat-icon"/>
				</div>
			</div>

			<!-- User Input Bar -->
			<form @submit.prevent class="inputbar-container">

				<!-- User input field -->
				<input id="user-input" v-model="userInput" name="user-input" type="text" class="input-text" placeholder="Enter a prompt..."/>

				<!-- Submit prompt button displayed as an image -->
				<img src="/src/assets/icons/send-chat-arrow-up.png" class="send-chat-button" @click="submitPrompt()"/> 
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, defineExpose } from 'vue';
	import { gsap } from 'gsap'; /* GSAP animation library, used for pretty much every animation in the code */
	import { TextPlugin } from 'gsap/TextPlugin'; /* Plugin from GSAP that will give the "typing" animation when the AI responds */
	import { ChatLog } from './utility/chatLog'; /* Class that holds information about each message thread / history */
	import type { ChatJSON } from './utility/typeInterfaceDefinitions'; /* Custom JSON object definition */

	// use dynamic import for mermaid since vite + terser didn't play nice with the static import
	// @ts-ignore
	var mermaid: any;
	
	(async () => {
		// @ts-ignore
		await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs").then((mermaidModule) => {
			mermaidModule.default.initialize({ startOnLoad: false });
			mermaid = mermaidModule.default;
		});
	})();
	gsap.registerPlugin(TextPlugin);

	var chatLogRef = ref<ChatLog>(new ChatLog([])); /* Currently Displayed Chatlog object */
	var chatWindow = ref<HTMLElement>(); /* Ref for the chat window HTML element */
	var chatHistory = ref<ChatJSON[]>(); /* All messages that have been send or received for the current Chat Log */
	var messageThreads = ref<ChatLog[]>([]); /* Messages that display in the sidebar */
	var messageThreadIDs = ref<string[]>([]);
	var userInput = ref<string>(""); /* User input reference */
	var loadingAIResponse = ref<boolean>(false); /* Flag that is used for the bouncing ellipsis animation */

	var renderMermaidGraph = async () => {
		await mermaid.run({ querySelector: ".mermaid" });
	}

	var downloadMermaidGraph = (elementIndex: number) => {
		var svgElement = document.getElementById("graph-" + elementIndex)?.querySelector("svg");

		// @ts-ignore
		var svgData = new XMLSerializer().serializeToString(svgElement);
		var encodedData = new TextEncoder().encode(svgData);
		var base64Data = btoa(String.fromCharCode(...encodedData));
		
		// @ts-ignore
		FileMaker.PerformScript("System - Download Mermaid Graph", JSON.stringify({graphEncoded: base64Data}));
	}

	var createNewChat = () => {
		// Check to see if the current chatlog history has been added to the sidebar, if not, then add it
		if (!messageThreads.value.includes(chatLogRef.value)){
			var chatTitle = chatLogRef.value.getChatTitle();
			messageThreads.value.unshift(chatLogRef.value);
			messageThreadIDs.value.unshift(chatLogRef.value.getId());
			// messageThreads.value.push(chatLogRef.value);
			// messageThreadIDs.value.push(chatLogRef.value.getId());

			// Wait for DOM to re-render, then grab most recently added chat log and animate the text
			// This is the "typing" animation that is activated when a chat thread is added to the sidebar
			setTimeout(() => {
				var threads = document.querySelectorAll(".chat-log");
				// var elementToAnimate = threads[threads.length - 1];
				var elementToAnimate = threads[0];
				textAnimation(elementToAnimate, chatTitle);
				textAnimation(".placeholder-text", "Submit a Message!");
			}, 1);
		}
		chatHistory.value = [];
		chatLogRef.value = new ChatLog([]);
		// @ts-ignore
		FileMaker.PerformScript("System - Update Thread ID", JSON.stringify({ threadID: "" }));
	}

	// history is an optional parameter that is there for FM purposes
	var renderChatLogs = (history?: any) => {
		if (history) {
			history = JSON.parse(history);
			chatLogRef.value.setChatHistory(history);
			chatHistory.value = history;
		}
		else {
			chatHistory.value = chatLogRef.value.getChatHistory();
		}

		setTimeout(() => {
			var elements = document.querySelectorAll(".ai-response");
			if (elements.length > 0) {
				elements[elements.length - 1].scrollIntoView({ behavior: "smooth" });
			}
		}, 100);
	}

	var submitPrompt = () => {
		// Validate that the user has input something
        if (userInput.value.length === 0) {
			return;
		}

		// If this is the first prompt sent, then we need to set the title of the chat
		// to be what the user requested so that we can display it on the sidebar
		if (chatLogRef.value.getChatHistory().length === 0) { 
			chatLogRef.value.setChatTitle(userInput.value);
		}

		// If there is something to send, build the JSON object and send it
        var userPrompt: ChatJSON = {
            role: "user",
            content: userInput.value
        };
		loadingAIResponse.value = true;
        chatLogRef.value.sendPrompt(userPrompt);
		chatLogRef.value.addAssistantResponse({content: "...", role: "loading"}, loadingAIResponse.value);
        userInput.value = "";

		renderChatLogs();
		
		setTimeout(() => {
			loadingAnimation();
		}, 100);
    }

	var openChatLog = (index: number, chatId: string) => {
		// Check to see if the current chatlog history has been added to the sidebar only if it has something
		// added to it, otherwise there's no reason to add it to the side bar. If it's not in the sidebar and
		// there is a chat history, then add it to the sidebar
		if (!messageThreads.value.includes(chatLogRef.value) && chatLogRef.value.getChatTitle() !== "New Thread") {
			var chatTitle = chatLogRef.value.getChatTitle();
			messageThreads.value.unshift(chatLogRef.value);
			messageThreadIDs.value.unshift(chatLogRef.value.getId());
			// messageThreads.value.push(chatLogRef.value);
			// messageThreadIDs.value.push(chatLogRef.value.getId());
			
			// Wait for DOM to re-render, then grab most recently added chat log and animate the text
			// This is the "typing" animation that is activated when a chat thread is added to the sidebar
			// Basically this is only activated if the current chat is a new chat and has not been added to the sidebar yet
			setTimeout(() => {
				var threads = document.querySelectorAll(".chat-log");
				var elementToAnimate = threads[0];
				textAnimation(elementToAnimate, chatTitle);
			}, 1);
		}

		// Set the chat window to display the selected chatlog thread
		chatLogRef.value = messageThreads.value[index];
		chatHistory.value = chatLogRef.value.getChatHistory();
		setTimeout(() => {
			renderMermaidGraph();
		}, 100);
		// @ts-ignore
		FileMaker.PerformScript("System - Update Thread ID", JSON.stringify({ threadID: chatId }));
	}

	var addMessage = (message: string, role: string, isMermaid?: boolean) => {
		var assistantResponse = isMermaid ? { role: role, content: message, isMermaid: true } : { role: role, content: message };
		chatLogRef.value.addAssistantResponse(assistantResponse);
		loadingAIResponse.value = false;
		renderChatLogs();

		// Wait for DOM to re-render, then grab most recently added AI response and animate the text
		// This is the "typing" animation that is activated when an AI response is received and displayed
		setTimeout(() => {
				var chats = document.querySelectorAll(".ai-response");
				var elementToAnimate = isMermaid ? chats[chats.length] : chats[chats.length - 1];
				var callback = () => {
					var elements = document.querySelectorAll(".ai-response");
					elements[elements.length - 1].scrollIntoView({ behavior: "smooth" });
					renderMermaidGraph();
				}
				textAnimation(elementToAnimate, message, callback);
		}, 1);
	}

	// This function is used on the initial load of the webviewer in FM. It takes the list of historical threads and
	// their respective IDs and creates display elements / ChatLog objects to store their history. These are the objects
	// that are initially displayed in the sidebar on first load
	var loadMessageThreads = (threads: any, idList: any) => {
		threads = JSON.parse(threads);
		idList = JSON.parse(idList);
		var iter = 0;
		for (var thread of threads) {
			messageThreads.value.push(new ChatLog(thread));
			messageThreads.value[iter].setId(idList[iter]);
			iter += 1;
		}
	}

	// This function is used when the thread ID is updated in FileMaker and needs to be updated for the current 
	// ChatLog object in the webviewer. FileMaker can call this function with the new thread ID, and the ChatLog
	// object will be set with the passed in ID
	var updateThreadID = (threadID: string) => {
		chatLogRef.value.setId(threadID);
	}

	// This is the animation code for the bouncing ellipsis when waiting for an AI response. It is invoked after
	// a user submits a prompt.	
	var loadingAnimation = () => {
		var tl = gsap.timeline({ repeat: -1 });
		tl.to(".ellipsis", {
			y: -2,
			stagger: 0.1,
			duration: 0.2
		})
		.to(".ellipsis", {
			y: 0,
			stagger: 0.1,
			duration: 0.2
		});
	}

	// This function is the core of the "typing" animation. The same code is used throughout the app multiple times
	// so I put it into a function
	var textAnimation = (elementToAnimate: string | Element, textContent: string, callbackFn?: () => void) => {
		if (callbackFn) {
			gsap.fromTo(elementToAnimate, {
						duration: 0,
						text: {
							value: ""
						}
					},
					{
						duration: 1,
						ease: "none",
						text: {
							value: textContent
						},
						onComplete: () => callbackFn()
					}
				);
		} else {
			gsap.fromTo(elementToAnimate, {
					duration: 0,
					text: {
						value: ""
					}
				},
				{
					duration: 1,
					ease: "none",
					text: {
						value: textContent
					}
				}
			);
		}

		
	}

	onMounted(() => {
		renderChatLogs();
		
		// Adding an event listener for the "Enter" key so users can simply click that rather than
		// having to manually click the submit prompt button each time they want to submit a prompt
		window.addEventListener("keydown", (event) => {
			if (event.code === "Enter") { 
				submitPrompt();
			}
		});

		// Let everything load then run animation
		setTimeout(() => {
			textAnimation(".placeholder-text", "Submit a Message!");
			textAnimation(".sidebar-placeholder-text", "Nothing to Display");
		}, 100);
	});

	defineExpose({
		addMessage,
		renderChatLogs,
		loadMessageThreads,
		updateThreadID
	});
</script>

<style lang="scss" scoped>

	.app-container {
		display: flex;
		max-height: 100vh;
		max-width: 100vw;
		gap: 3rem;
		background-color: var(--raisin-black);

		.sidebar-container {
			display: flex;
			flex-direction: column;
			padding: 0.5rem;
			width: 20%;
			height: calc(100vh - 1rem);
			border-right: 1px solid black;
			background-color: var(--dark-gunmetal); 
			overflow-y: scroll;
			

			.chat-log-container {
				display: flex;
				flex-direction: column;
				margin: 1rem 0;
				gap: 0.25rem;
				overflow-y: scroll;
				
				&::-webkit-scrollbar {
					display: none;
				}

				.chat-log {
					min-height: 18px;
					padding: 10px 0.5rem;
					border-radius: 0.5rem;
					color: lightgray;
					border: 1px solid black;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					background-color: var(--raisin-black);
					transition-duration: 0.3s;

					&:hover {
						cursor: pointer;
						background-color: lightgray;
						color: black;
						opacity: 0.75;
					}
				}

				.sidebar-placeholder-text {
					display: flex;
					align-self: center;
					margin: auto 0;
					text-align: center;
					font-size: 16px;
					color: lightgray;
				}
			}

			.title-row {
				display: flex;
				position: relative;
				justify-content: center;

				.title {
					display: flex;
					font-size: 24px;
					color: lightgray;

					&:hover {
						cursor: default;
					}
				}

				.new-chat-button {
					position: absolute;
					top: 2px;
					right: 0;
					width: 28px;
					height: 28px;
					transition-duration: 0.2s;

					&:hover {
						cursor: pointer;
						transform: scale(1.05);
					}
				}
			}
		}

		.chat-window-container {
			display: flex;
			flex-direction: column;
			justify-content: start;
			align-items: center;
			padding: 1rem 0 2rem 0;
			margin-right: 1rem;
			width: calc(100vw - 20%);
			border-radius: 0.75rem;
			background-color: var(--raisin-black);

			.chat-window {
				display: flex;
				flex-direction: column;
				position: relative;
				height: calc(100vh - 3.5rem - 50px);
				width: 100%;
				gap: 0.5rem;
				border-bottom: none;
				overflow: scroll;
				
				&::-webkit-scrollbar {
					display: none;
				}

				.placeholder-text {
					display: flex;
					align-self: center;
					margin: auto 0;
					text-align: center;
					font-size: 36px;
					color: lightgray;
				}

				.chat-bubble-container {
					display: flex;
					position: relative;
					align-items: center;
					width: 100%;

					.user-chat-icon {
						width: 48px;
						height: 48px;
						margin-right: 6px;
						padding-top: 8px;
					}

					.user-chat-bubble {
						position: relative;
						background-color: black;
						color: lightgray;
						border-radius: 0.4rem;
						max-width: 40%;
						height: fit-content;
						padding: 0.5rem;
						justify-self: end;
						margin-right: 16px;
						margin-left: auto;

						&::after {
							content: "";
							position: absolute;
							right: 0;
							top: 50%;
							width: 0;
							height: 0;
							border: 16px solid transparent;
							border-left-color: black;
							border-right: 0;
							border-bottom: 0;
							margin-top: -8px;
							margin-right: -16px;
						}
					}

					.ai-chat-icon {
						width: 48px;
						height: 48px;
						padding-top: 10px;
					}

					.ai-chat-bubble {
						display: flex;
						align-items: center;
						position: relative;
						background-color: black;
						color: lightgray;
						border-radius: 0.4rem;
						max-width: 40%;
						height: fit-content;
						padding: 0.5rem;
						justify-self: start;
						margin-left: 8px;

						&::after {
							content: "";
							position: absolute;
							left: 0;
							top: 50%;
							width: 0;
							height: 0;
							border: 16px solid transparent;
							border-right-color: black;
							border-left: 0;
							border-bottom: 0;
							margin-top: -8px;
							margin-left: -16px;
						}
					}

					.mermaid-graph-bubble {
						min-width: 50vw !important;
						max-width: 60vw !important;

						.mermaid-graph {
							background-color: white;
							width: 100%;
							border-radius: 0.1rem;

							&:hover {
								cursor: pointer;
							}
						}
					}
				}

				
			}

			.inputbar-container {
				display: flex;
				flex-direction: row;
				align-items: center;
				position: absolute;
				bottom: 1rem;
				width: calc(80% - 6rem);
				height: 50px;
				border: 1px solid black;
				border-radius: 0.75rem;
				background-color: var(--dark-gunmetal);
				

				.input-text {
					display: flex;
					width: 100%;
					border: none;
					border-radius: 0.75rem;
					padding: 0 1rem;
					background-color: var(--dark-gunmetal);
					color: lightgray;
					font-size: 16px;

					&:focus-visible {
						outline: none;
					}
				}

				.send-chat-button {
					width: 35px;
					height: 35px;
					margin-right: 5px;
					transition-duration: 0.3s;
					opacity: 0.75;

					&:hover {
						cursor: pointer;
						transform: scale(1.05);
						opacity: 1;
					}
				}
			}
		}
	}
</style>