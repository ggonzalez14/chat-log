<template>
	<div class="app-container">
		<!-- Message Thread Sidebar -->
		<div class="sidebar-container">
			<div class="title-row">
				<span class="title">Chat Log</span>
				<img src="/src/assets/icons/new-chat.png" class="new-chat-button" @click="createNewChat()"/>
			</div>
			
			<div class="chat-log-container">
				<span v-for="(chatLog, index) in messageThreads" class="chat-log" @click="openChatLog(index)">
					{{ chatLog.getChatTitle() }}
				</span>
			</div>
		</div>

		<!-- Main Chat Window -->
		<div class="chat-window-container">
			<div ref="chatWindow" class="chat-window">
				<span v-if="chatHistory && chatHistory.length === 0" class="placeholder-text">
					Submit a message!
				</span>
				<div class="chat-bubble-container"
					v-else
					v-for="chat in chatHistory" 
				>
					
					<img v-if="chat.role === 'assistant' || chat.role === 'loading'" src="/src/assets/icons/ai-chat-icon.png" class="ai-chat-icon"/>
					<span v-if="chat.role === 'assistant' || chat.role === 'user'  || chat.role === 'loading'"
						:class="chat.role === 'user' ? 'user-chat-bubble' : 'ai-chat-bubble'"
					>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="chat.role === 'user' || chat.role === 'assistant'" class="ai-response">
							{{ chat.content }}
						</span>
					</span>
					<img v-if="chat.role === 'user'" src="/src/assets/icons/user-chat-icon.png" class="user-chat-icon"/>
				</div>
				
				
			</div>

			<!-- User Input Bar -->
			<form @submit.prevent class="inputbar-container">
				<input id="user-input" v-model="userInput" name="user-input" type="text" class="input-text" placeholder="Enter a prompt..."/>
				<img src="/src/assets/icons/send-chat.png" class="send-chat-button" @click="submitPrompt()"/> 
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, defineExpose } from 'vue';
	import { gsap } from 'gsap';
	import { TextPlugin } from 'gsap/TextPlugin';
	import { ChatLog } from './utility/chatLog';
	import type { ChatJSON } from './utility/typeInterfaceDefinitions';

	gsap.registerPlugin(TextPlugin);

	var chatLogRef = ref<ChatLog>(new ChatLog([])); 	/* Currently Displayed Chatlog */
	var chatWindow = ref<HTMLElement>(); /* Ref for the chat window HTML element */
	var chatHistory = ref<ChatJSON[]>(); /* All messages that have been send or received for the current Chat Log */
	var messageThreads = ref<ChatLog[]>([]); /* Messages that display in the sidebar */
	var messageThreadIDs = ref<string[]>([]);
	var userInput = ref<string>(""); /* User input reference */
	var loadingAIResponse = ref<boolean>(false);

	var createNewChat = () => {
		// Check to see if the current chatlog history has been added to the sidebar, if not, then add it
		if (!messageThreads.value.includes(chatLogRef.value)){
			var chatTitle = chatLogRef.value.getChatTitle();
			messageThreads.value.push(chatLogRef.value);
			messageThreadIDs.value.push(chatLogRef.value.getId());

			// Wait for DOM to re-render, then grab most recently added chat log and animate the text
			setTimeout(() => {
				var threads = document.querySelectorAll(".chat-log");
				var elementToAnimate = threads[threads.length - 1];
				gsap.fromTo(elementToAnimate, {
						duration: 0,
						text: {
							value: ""
						}
					},
					{
						duration: 1,
						text: {
							value: chatTitle
						}
					}
				);
			}, 1);
		}
		chatHistory.value = [];
		chatLogRef.value = new ChatLog([]);		
	}

	var renderChatLogs = (history?: any) => {
		if (history) {
			history = JSON.parse(history);
			chatLogRef.value.setChatHistory(history);
			chatHistory.value = history;
		}
		else {
			chatHistory.value = chatLogRef.value.getChatHistory();
		}
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
			// setTimeout(() => {
			// 	addMessage(' Check to see if the current chatlog history has been added to the sidebar only if it has something added to it, otherwise theres no reason to add it to the side bar. If its not in the sidebar andthere is a chat history, then add it to the sidebar', 'assistant');
			// }, 1000);
		}, 100);
    }

	var openChatLog = (index: number) => {
		// Check to see if the current chatlog history has been added to the sidebar only if it has something
		// added to it, otherwise there's no reason to add it to the side bar. If it's not in the sidebar and
		// there is a chat history, then add it to the sidebar
		if (!messageThreads.value.includes(chatLogRef.value) && chatLogRef.value.getChatTitle() !== "New Thread") {
			var chatTitle = chatLogRef.value.getChatTitle();
			messageThreads.value.push(chatLogRef.value);
			messageThreadIDs.value.push(chatLogRef.value.getId());
			
			// Wait for DOM to re-render, then grab most recently added chat log and animate the text
			setTimeout(() => {
				var threads = document.querySelectorAll(".chat-log");
				var elementToAnimate = threads[threads.length - 1];
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
							value: chatTitle
						}
					}
				);
			}, 1);
		}

		// Set the chat window to display the selected chatlog thread
		chatLogRef.value = messageThreads.value[index];
		chatHistory.value = chatLogRef.value.getChatHistory();
	}

	var addMessage = (message: string, role: string) => {
		chatLogRef.value.addAssistantResponse({ role: role, content: message });
		loadingAIResponse.value = false;
		renderChatLogs();

		// Wait for DOM to re-render, then grab most recently added ai response and animate the text
		setTimeout(() => {
				var chats = document.querySelectorAll(".ai-response");
				var elementToAnimate = chats[chats.length - 1];
				gsap.fromTo(elementToAnimate, {
						duration: 0,
						text: {
							value: ""
						}
					},
					{
						duration: 1,
						text: {
							value: message
						}
					}
				);
			}, 1);
	}

	var loadMessageThreads = (threads: any) => {
		threads = JSON.parse(threads);
		for (var thread of threads) {
			messageThreads.value.push(new ChatLog(thread));
		}
	}

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

	onMounted(() => {
		renderChatLogs();
		
		window.addEventListener("keydown", (event) => {
			if (event.code === "Enter") { 
				submitPrompt();
			}
		});

		// On the inital page load, animate the text in the sidebar
		setTimeout(() => {
			var chatLogs = document.querySelectorAll(".chat-log");
			chatLogs.forEach((chatLog, index) => {
				gsap.fromTo(chatLog, 
				{
					duration: 0,
					text: {
						value: ""
					}
				},
				{
					duration: 1,
					text: {
						value: messageThreads.value[index].getChatTitle()
					}
				});
			});
		}, 1);
	});

	defineExpose({
		addMessage,
		renderChatLogs,
		loadMessageThreads
	});
</script>

<style lang="scss" scoped>

	.app-container {
		display: flex;
		max-height: 100vh;
		max-width: 100vw;
		padding: 1rem;
		gap: 3rem;
		background-color: var(--raisin-black);

		.sidebar-container {
			display: flex;
			flex-direction: column;
			padding: 0.5rem;
			width: 20%;
			height: calc(100vh - 3rem);
			border-radius: 0.75rem;
			background-color: var(--dark-gunmetal);
			box-shadow: 0 0 10px 1px black;
			overflow-y: scroll;

			.chat-log-container {
				display: flex;
				flex-direction: column;
				margin: 1rem 0;
				gap: 0.25rem;

				.chat-log {
					padding: 10px 0.5rem;
					border-radius: 0.5rem;
					color: lightgray;
					// color: #0860C8;
					border: 1px solid black;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					background-color: var(--raisin-black);
					transition-duration: 0.3s;

					&:hover {
						cursor: pointer;
						background-color: black;
					}
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
					// color: #0860C8;
				}

				.new-chat-button {
					position: absolute;
					top: 0;
					right: 0;
					width: 32px;
					height: 32px;

					&:hover {
						cursor: pointer;
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
			width: calc(100vw - 20%);
			box-shadow: 0 0 10px 1px black;
			border-radius: 0.75rem;
			background-color: var(--light-black);

			.chat-window {
				display: flex;
				flex-direction: column;
				position: relative;
				height: calc(100vh - 5rem - 50px);
				width: 100%;
				gap: 0.5rem;
				border-bottom: none;
				overflow: scroll;

				.placeholder-text {
					display: flex;
					align-self: center;
					margin: auto 0;
					text-align: center;
					font-size: 36px;
					color: lightgray;
					// color: #0860C8;

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
				}

				
			}

			.inputbar-container {
				display: flex;
				flex-direction: row;
				position: absolute;
				bottom: 2rem;
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
					// color: black;

					&:focus-visible {
						outline: none;
					}
				}

				.send-chat-button {

					&:hover {
						cursor: pointer;
						transform: scale(1.05);
						animation-duration: 500ms;
					}
				}
			}
		}
	}
</style>