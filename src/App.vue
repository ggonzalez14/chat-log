<template>
	<div class="app-container">
		<!-- Message Thread Sidebar -->
		<div class="sidebar-container">
			<div class="title-row">
				<span class="title">Chat Log</span>
				<img src="/src/assets/icons/new-chat.png" class="new-chat-button" @click="createNewChat()"/>
			</div>
			
			<div class="chat-log-container">
				<span v-for="(chatLog, index) in messageThreads" class="chat-log" @click="openChatLog(index, chatLog.getId())">
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
					
					<img v-if="chat.role === 'assistant' || chat.role === 'loading' || chat.role === 'mermaid'" src="/src/assets/icons/ai-chat-icon-lightgray.png" class="ai-chat-icon"/>
					<span v-if="chat.role === 'assistant' || chat.role === 'user'  || chat.role === 'loading' || chat.role === 'mermaid'"
						:class="chat.role === 'user' ? 'user-chat-bubble' : 'ai-chat-bubble'"
					>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="loadingAIResponse && chat.role === 'loading'" class="ellipsis">.</span>
						<span v-if="chat.role === 'user' || chat.role === 'assistant'" class="ai-response">
							{{ chat.content }}
						</span>
						<pre v-if="chat.role === 'mermaid'" class="mermaid">
							{{ chat.content }}
						</pre>
					</span>
					<img v-if="chat.role === 'user'" src="/src/assets/icons/user-chat-icon-lightgray.png" class="user-chat-icon"/>
				</div>
				
				
			</div>

			<!-- User Input Bar -->
			<form @submit.prevent class="inputbar-container">
				<input id="user-input" v-model="userInput" name="user-input" type="text" class="input-text" placeholder="Enter a prompt..."/>
				<img src="/src/assets/icons/send-chat-arrow-up.png" class="send-chat-button" @click="submitPrompt()"/> 
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { ref, onMounted, defineExpose } from 'vue';
	import { gsap } from 'gsap';
	// import mermaid from 'mermaid';
	import { TextPlugin } from 'gsap/TextPlugin';
	import { ChatLog } from './utility/chatLog';
	import type { ChatJSON } from './utility/typeInterfaceDefinitions';

	// mermaid.initialize({ startOnLoad: true })
	gsap.registerPlugin(TextPlugin);

	var chatLogRef = ref<ChatLog>(new ChatLog([]));
	// var chatLogRef = ref<ChatLog>(new ChatLog([{
	// 	role: "mermaid", 
	// 	content: `sequenceDiagram\n\tparticipant Alice\n\tparticipant Bob\n\tAlice->>John: Hello John, how are you?\n\tloop Healthcheck\n\t\tJohn->>John: Fight against hypochondria\n\tend\n\tNote right of John: Rational thoughts <br/>prevail...\n\tJohn-->>Alice: Great!\n\tJohn->>Bob: How about you?\n\tBob-->>John: Jolly good!`
	// }])); 	/* Currently Displayed Chatlog */
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
		// @ts-ignore
		FileMaker.PerformScript("System - Update Thread ID", JSON.stringify({ threadID: "" }));
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

		setTimeout(() => {
			var elements = document.querySelectorAll(".ai-response");
			elements[elements.length - 1].scrollIntoView({ behavior: "smooth" });
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
		// @ts-ignore
		FileMaker.PerformScript("System - Update Thread ID", JSON.stringify({ threadID: chatId }));
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
						},
						onComplete: () => {
							var elements = document.querySelectorAll(".ai-response");
							elements[elements.length - 1].scrollIntoView({ behavior: "smooth" });
						}
					}
				);
		}, 1);
	}

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

	var updateThreadID = (threadID: string) => {
		chatLogRef.value.setId(threadID);
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

		// loadMessageThreads(historicalThreads);

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
		loadMessageThreads,
		updateThreadID
	});

	// Dev Data
	let historicalThreads = [[
	{
		"content" : "What is the capital of France",
		"role" : "user"
	},
	{
		"content" : "The capital of France is Paris.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Where can I sync invoices to quickbooks",
		"role" : "user"
	},
	{
		"content" : "The provided documents do not contain information about syncing invoices to QuickBooks. Please refer to the company's accounting or finance documentation for guidance on this process.",
		"role" : "assistant"
	},
	{
		"content" : "The provided documentation does not contain information on syncing invoices to QuickBooks. Please refer to the company's accounting or finance documentation for guidance on this process.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Where in the system can I run a mass sync of invoices to quickbooks",
		"role" : "user"
	},
	{
		"content" : "You can navigate to the QBO Dashboard to run a mass sync of invoices to QuickBooks. I've taken you there for convenience.",
		"role" : "assistant"
	}
],[
	{
		"content" : "What are the steps to installing FileMaker server on a Mac",
		"role" : "user"
	},
	{
		"content" : "To install FileMaker Server on a Mac, follow these steps:\r1. Download the installation disk image and license certificate file as per your electronic download instructions.\r2. Place the license certificate in the Downloads folder or the installer folder.\r3. Double-click the installation icon. If a security message appears, click Continue.\r4. Choose a language and click OK.\r5. Continue with the installation by clicking Continue.\r6. Read and accept the end user license agreement.\r7. Choose FileMaker Server primary machine.\r8. Choose an option for the FileMaker Server user account.\r9. Assign the user name and password for Admin Console.\r10. Enter a PIN value for password reset using CLI.\r11. Click Install and enter your macOS user name and password, then click Install Software.\r12. After installation, open Admin Console by clicking Continue.\r13. Enter http://127.0.0.1:16001/admin-console into a web browser to open Admin Console later.\r14. On the Admin Console Sign In page, enter the Admin Console account user name and password, then click Sign In.\r15. Decide whether to import an SSL certificate on the Admin Console Security Settings page.\r16. Note the IP address of the server on the Dashboard page.\r17. Enable settings on the Connectors tab in Admin Console if you want to allow technologies like FileMaker WebDirect, FileMaker Data API, and ODBC and JDBC to access hosted databases.",
		"role" : "assistant"
	},
	{
		"content" : "To install FileMaker Server on a Mac, follow these steps:\r1. Download the installation disk image and license certificate file as per your electronic download instructions.\r2. Place the license certificate in the default Downloads folder or the installer folder.\r3. Double-click the installation icon. If a security message appears, click Continue.\r4. Choose a language and click OK.\r5. Continue with the installation by clicking Continue.\r6. Read and accept the end user license agreement.\r7. Choose FileMaker Server primary machine.\r8. Choose an option for the FileMaker Server user account.\r9. Assign the user name and password for Admin Console.\r10. Enter your macOS user name and password, then click Install Software.\r11. After installation, open Admin Console by clicking Continue.\r12. Enter the Admin Console account user name and password to sign in.\r13. Decide whether to import an SSL certificate on the Admin Console Security Settings page.\r14. Note the IP address of the server on the Dashboard page.\r15. Enable settings on the Connectors tab in Admin Console if needed.\rYou can read more about it in the FileMaker Server Installation Guide by clicking the paperclip icon above.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Can you summarize our recent contacts with Jo Blake",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our recent contacts with Jo Blake:\r\r- **5/8/2024**: Followed up on pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within the next week.\r- **7/22/2024**: Jo expressed dissatisfaction with shipping times on the last order. Offered a 10% discount on the next purchase to retain goodwill.\r- **8/15/2024**: Discussed a new product launch. Jo showed interest but is waiting for the fiscal year budget to be finalized before committing.\r- **9/4/2024**: Assisted with troubleshooting an account issue, which was resolved within 48 hours, leading to expressed satisfaction from Jo.",
		"role" : "assistant"
	},
	{
		"content" : "Can you draft an email with a two sentence summary of these contacts? Send it to sgallagher@dbservics.com",
		"role" : "user"
	},
	{
		"content" : "I have drafted the email for you. Here's the content:\r\rSubject: Summary of Recent Contacts with Jo Blake\r\rBody:\rOver the past few months, Jo Blake has shown interest in our new product launch, pending their fiscal budget. Additionally, we've addressed shipping concerns and resolved an account issue promptly, ensuring a satisfied customer.\r\rThe email has been sent to sgallagher@dbservices.com.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Where do I sync invoices to QUickBooks",
		"role" : "user"
	},
	{
		"content" : "The provided documentation does not contain information on syncing invoices to QuickBooks.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Where do I sync Invoices to Quickbooks",
		"role" : "user"
	},
	{
		"content" : "To sync invoices to QuickBooks, you should navigate to the QuickBooks Dashboard in the FileMaker QuickStart. From there, you can view un-synced QuickBooks records, including Orders, Purchase Orders, and Returns, and run a mass sync. Would you like me to take you to the QuickBooks Dashboard now?",
		"role" : "assistant"
	},
	{
		"content" : "yes please",
		"role" : "user"
	},
	{
		"content" : "You have been navigated to the QuickBooks Dashboard. From here, you can manage and sync your records to QuickBooks. If you need further assistance, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "Where can I mass sync invoices to quickbooks",
		"role" : "user"
	},
	{
		"content" : "You can mass sync invoices to QuickBooks by navigating to the dashboard layout in the FileMaker QuickStart, where you can view un-synced QuickBooks records (Orders, Purchase Orders, Returns) and run the mass sync. Would you like to go there now?",
		"role" : "assistant"
	},
	{
		"content" : "Yes please",
		"role" : "user"
	},
	{
		"content" : "I've navigated you to the QuickBooks Online Dashboard where you can proceed with mass syncing invoices and other records to QuickBooks.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Can you summarize our recent contacts with Jo Blake",
		"role" : "user"
	},
	{
		"content" : "Here's a summary of our recent contacts with Jo Blake:\r\r- **May 8, 2024**: Followed up on pending payment issues. Jo wasn't aware of the outstanding balance and promised to settle it within a week.\r- **July 22, 2024**: Jo expressed dissatisfaction with previous shipping times. Offered a 10% discount on the next purchase to maintain goodwill.\r- **August 15, 2024**: Discussed a new product launch. Jo showed interest but is waiting for their fiscal year budget finalization before making a commitment.\r- **September 4, 2024**: Assisted Jo in troubleshooting an account issue, resolved in 48 hours, with Jo expressing satisfaction with the support received.",
		"role" : "assistant"
	},
	{
		"content" : "Can condense this to 2 sentences and draft an email to sgallagher@dbservices.com",
		"role" : "user"
	},
	{
		"content" : "Here's a condensed summary in two sentences and an email draft:\r\r---\r\rSubject: Summary of Recent Contacts with Jo Blake\r\rHi,\r\rHere is the recent interaction summary with Jo Blake. We addressed pending payment and shipping dissatisfaction and discussed new product interest pending budget updates. Account troubleshooting resulted in quick resolution and customer satisfaction.\r\rBest regards,\r[Your Name]",
		"role" : "assistant"
	}
],[
	{
		"content" : "Can you add the company Claris and add contact John Smith",
		"role" : "user"
	},
	{
		"content" : "The company \"Claris\" and the contact \"John Smith\" have been successfully added to the system. If you need further assistance, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "What the steps to installing FileMaker server on a Mac",
		"role" : "user"
	},
	{
		"content" : "Installing FileMaker Server on a Mac involves several steps. Here’s a general guideline on how to do it:\r\r1. **Check System Requirements**: Ensure your Mac meets the necessary system requirements for the version of FileMaker Server you plan to install.\r\r2. **Download Installation Package**: Obtain the FileMaker Server installation package from the official FileMaker website or through your FileMaker account.\r\r3. **Prepare for Installation**:\r   - Disable any antivirus software temporarily during the installation process.\r   - Ensure that no other applications or services on your Mac are using ports that FileMaker Server might use (e.g., port 80 for HTTP).\r\r4. **Run the Installer**:\r   - Open the downloaded installation package.\r   - Double-click on the installer file to start the installation process.\r   - Follow the on-screen instructions provided by the installation wizard.\r\r5. **License Agreement and Key**:\r   - Accept the license agreement.\r   - Enter your FileMaker Server license key when prompted.\r\r6. **Configure Installation Options**:\r   - Choose an appropriate installation type (typically \"Full\" installation).\r   - Specify the installation folder if prompted.\r\r7. **Set Admin Console Password**: During installation, you will be prompted to set up a username and password for the FileMaker Server Admin Console.\r\r8. **Complete the Installation**:\r   - Wait for the installation process to complete.\r   - Once finished, launch the FileMaker Server Admin Console to verify the installation.\r\r9. **Post-Installation Steps**:\r   - Re-enable any antivirus software that was disabled.\r   - Configure your server settings and databases as needed.\r\r10. **Verify Functionality**: \r    - Confirm that FileMaker Server is running correctly by accessing the Admin Console and performing basic operations like launching a test database.\r\rKeep in mind that specific details may vary slightly depending on the version of FileMaker Server you are installing. It's always a good idea to refer to the official FileMaker Server installation guide for the version you are using.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Create the company Poltor Co. and add the contact Josie Smith",
		"role" : "user"
	},
	{
		"content" : "The company \"Poltor Co.\" has been created, and the contact \"Josie Smith\" has been successfully added.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Where can I mass sync invoices to quickbooks?",
		"role" : "user"
	},
	{
		"content" : "You can mass sync invoices to QuickBooks by navigating to the QuickBooks Dashboard in the FileMaker QuickStart. Let me take you there.",
		"role" : "assistant"
	},
	{
		"content" : "I've taken you to the QuickBooks Dashboard, where you can view un-synced records such as Orders, Purchase Orders, and Returns, and perform a mass sync to QuickBooks.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Sumarize our recent contacts with Jo Blake",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our recent contacts with Jo Blake:\r\r1. On May 8, 2024, we followed up with Jo regarding pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within the next week.\r   \r2. On July 22, 2024, Jo expressed dissatisfaction with the shipping times of their last order. We offered a 10% discount on their next purchase to maintain goodwill.\r   \r3. On August 15, 2024, we reached out to discuss a new product launch. Jo showed interest but mentioned they are waiting for their fiscal year budget to be finalized before committing.\r\r4. On September 4, 2024, Jo requested assistance with troubleshooting an issue with their account. The issue was resolved within 48 hours, and Jo expressed satisfaction with the support provided.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Where can I run a mass sync of invoices to quickbooks",
		"role" : "user"
	},
	{
		"content" : "You can run a mass sync of invoices to QuickBooks from the QuickBooks Online Dashboard within the FileMaker QuickStart. Would you like me to navigate you to the QuickBooks Online Dashboard?",
		"role" : "assistant"
	},
	{
		"content" : "Yes please",
		"role" : "user"
	},
	{
		"content" : "You have been navigated to the QuickBooks Online Dashboard. From here, you can view un-synced records and perform a mass sync of invoices to QuickBooks. Let me know if you need any further assistance!",
		"role" : "assistant"
	}
],[
	{
		"content" : "where do i run mass syncs of invoices to quickbooks",
		"role" : "user"
	},
	{
		"content" : "You can run mass syncs of invoices to QuickBooks from the QuickStart's QBO Dashboard. Let me take you there.",
		"role" : "assistant"
	},
	{
		"content" : "You are now on the QBO Dashboard, where you can view un-synced QuickBooks records and run a mass sync of invoices and other financial documents.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our contacts with Jo Blake in the last 6 months:\r\r- **May 8, 2024:** Followed up with the customer regarding pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within the next week.\r\r- **July 22, 2024:** Jo expressed dissatisfaction with shipping times on their last order. To maintain goodwill, we offered a 10% discount on their next purchase.\r\r- **August 15, 2024:** We reached out to discuss a new product launch. Jo showed interest but mentioned they are waiting for their fiscal year budget to be finalized before making a commitment.\r\r- **September 4, 2024:** Jo requested assistance with troubleshooting an issue with their account. The issue was resolved within 48 hours, and Jo expressed satisfaction with the support provided.",
		"role" : "assistant"
	},
	{
		"content" : "Can you condense this to 2 sentences and draft an email. Send it to tipsis2@hotmail.com",
		"role" : "user"
	},
	{
		"content" : "Here's a condensed version of our interactions with Jo Blake:\r\r\"In the past six months, Jo has settled pending payment issues, expressed dissatisfaction with shipping times (which we addressed with a discount), conveyed interest in our new product launch pending budget finalization, and sought assistance for and was satisfied with support on an account issue. Jo's overall sentiment appears positive despite some initial concerns, reflecting effective resolution and engagement.\"\r\rI'll draft and send the email now.",
		"role" : "assistant"
	},
	{
		"content" : "I've drafted the email to tipsis2@hotmail.com with the condensed summary of our interactions with Jo Blake. You can review and send it from your email client.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Create a contact for John Brown for ABC company",
		"role" : "user"
	},
	{
		"content" : "The contact John Brown has been successfully created for ABC company.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Create a new company Were Inc. and add a contacts Brian Hill",
		"role" : "user"
	},
	{
		"content" : "The company \"Were Inc.\" has been created, and the contact \"Brian Hill\" has been successfully added to the company. If you need further assistance, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "Who is Devan Glover",
		"role" : "user"
	}
],[
	{
		"content" : "What is your function?",
		"role" : "user"
	},
	{
		"content" : "I assist users with navigating and utilizing the FileMaker QuickStart system. This includes performing actions like creating companies and contacts, searching for products, viewing and syncing QuickBooks records, sending emails, and providing summaries of contact notes. If you need help with anything related to FileMaker QuickStart, just let me know!",
		"role" : "assistant"
	},
	{
		"content" : "show me the Quickstart settings",
		"role" : "user"
	}
],[
	{
		"content" : "What is your purpose",
		"role" : "user"
	},
	{
		"content" : "I'm here to assist you with questions and tasks related to the FileMaker QuickStart, a starter file created by DB Services. I can help you manage contacts, create company records, perform product searches, send emails, and more within the QuickStart system. Let me know how I can assist you today!",
		"role" : "assistant"
	}
],[
	{
		"content" : "What is your purpose?",
		"role" : "user"
	},
	{
		"content" : "I am the QuickStart Assistant, designed to help users interact with the FileMaker QuickStart system. My purpose is to answer questions related to the QuickStart system, assist with various tasks like creating or managing contacts and companies, facilitate email sending, perform database queries, and more, all within the context of the QuickStart file.",
		"role" : "assistant"
	}
],[
	{
		"content" : "what is your purpose?",
		"role" : "user"
	},
	{
		"content" : "I am here to assist you in navigating and using the FileMaker QuickStart application. I can help you find products, manage contacts and companies, send emails, sync with QuickBooks, and more. Let me know how I can assist you!",
		"role" : "assistant"
	},
	{
		"content" : "What is your purpose?",
		"role" : "user"
	},
	{
		"content" : "My purpose is to assist users in utilizing the FileMaker QuickStart application effectively. I provide support in tasks such as managing contacts and companies, searching for products, sending emails, and integrating with QuickBooks. Let me know how I can help you!",
		"role" : "assistant"
	}
],[
	{
		"content" : "what is your purpose",
		"role" : "user"
	},
	{
		"content" : "My purpose is to assist you with tasks and questions related to the FileMaker QuickStart. I can help manage contacts and companies, execute specific functions like creating records, sending emails, managing database interactions, and more within the QuickStart environment.",
		"role" : "assistant"
	}
],[
	{
		"content" : "What is your purpose?",
		"role" : "user"
	},
	{
		"content" : "I assist with tasks related to the FileMaker QuickStart application by providing answers, executing functions like creating records, searching for products, sending emails, and performing database operations. My goal is to help users efficiently interact with the QuickStart system and streamline their workflows.",
		"role" : "assistant"
	}
],[
	{
		"content" : "what is your purpose?",
		"role" : "user"
	},
	{
		"content" : "I am designed to assist users with interacting with the FileMaker QuickStart application provided by DB Services. My main functions include helping with database operations like creating records for companies and contacts, summarizing customer notes, searching for products, sending emails, and executing SQL queries within the FileMaker QuickStart database system.",
		"role" : "assistant"
	}
],[
	{
		"content" : "What is your purpose",
		"role" : "user"
	},
	{
		"content" : "I am here to assist you with tasks and questions related to the FileMaker QuickStart. I can perform a variety of functions like creating company records, managing contacts, searching for products, generating summaries, sending emails, and more. If you have any specific requests or need assistance navigating the QuickStart, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "what is your purpose",
		"role" : "user"
	},
	{
		"content" : "I assist users with questions and actions related to the FileMaker QuickStart, a FileMaker file distributed by DB Services as a starter file. I perform tasks such as database operations, creating records, sending emails, and more.",
		"role" : "assistant"
	}
],[
	{
		"content" : "what is your purpose",
		"role" : "user"
	},
	{
		"content" : "I am here to assist you with questions and tasks related to the FileMaker QuickStart. Whether you need help navigating the FileMaker QuickStart, performing specific actions like creating records or sending emails, or finding information within the system, I'm here to guide and support you. If you have any specific questions or tasks in mind, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "what is your purpose",
		"role" : "user"
	},
	{
		"content" : "I am here to assist you with questions and actions related to the FileMaker QuickStart, a starter file distributed by DB Services. I can help you with tasks like searching for products, creating company and contact records, summarizing contact notes, sending emails, and more within the QuickStart system. Let me know how I can assist you!",
		"role" : "assistant"
	}
],[
	{
		"content" : "What is your purpose",
		"role" : "user"
	},
	{
		"content" : "I am here to help you interact with the FileMaker QuickStart application. I can assist you with actions such as searching for products, creating company and contact records, summarizing contact notes, sending emails, and more within the context of the FileMaker QuickStart system. If you have any specific questions or tasks, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "What is your purpose?",
		"role" : "user"
	},
	{
		"content" : "I am designed to assist users with interacting with FileMaker QuickStart, a starter database file distributed by DB Services. My role includes helping with managing and creating records, performing various database operations, providing summaries, and assisting with QuickStart functionalities.",
		"role" : "assistant"
	},
	{
		"content" : "Can you tell me more?",
		"role" : "user"
	},
	{
		"content" : "Sure! Here are some of the tasks I can assist with in the FileMaker QuickStart:\r\r1. **Creating and Managing Records:**\r   - I can create new company and contact records.\r   - You can update and manage existing records in the system.\r\r2. **Email Management:**\r   - I can send emails with specified content, recipients, and other details.\r\r3. **Data Summary:**\r   - I provide summaries of contact notes and other important information.\r\r4. **QuickBooks Integration:**\r   - I help with managing QuickBooks Online records and synchronizing data.\r\r5. **Product Search:**\r   - Users can perform a semantic search for products within the system.\r\r6. **Database Operations:**\r   - I can execute SQL queries using the database schema.\r\r7. **Navigation:**\r   - I guide users to specific dashboards or sections within the QuickStart.\r\rI'm here to help streamline these processes and make managing information easier for you!",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our interactions with Jo Blake over the past six months:\r\r- **May 8, 2024**: Followed up on pending payment issues. Jo was unaware of the outstanding balance but promised to settle within the next week.\r- **July 22, 2024**: Jo expressed dissatisfaction with shipping times on the last order. Offered a 10% discount on the next purchase to maintain goodwill.\r- **August 15, 2024**: Discussed a new product launch. Jo showed interest but mentioned waiting for the fiscal year budget to be finalized before committing.\r- **September 4, 2024**: Jo requested help with troubleshooting an account issue. The issue was resolved within 48 hours, and Jo expressed satisfaction with the support provided.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here's a summary of our recent interactions with Jo Blake over the last six months:\r\r- **5/8/2024:** Discussed pending payment issues. Jo was unaware of the outstanding balance but assured payment would be settled within a week.\r- **7/22/2024:** Jo expressed dissatisfaction with shipping times. We offered a 10% discount on the next purchase to retain goodwill.\r- **8/15/2024:** Discussed new product launch. Jo showed interest but is waiting for the fiscal year budget to be finalized.\r- **9/4/2024:** Assisted Jo with troubleshooting an account issue, which was resolved in 48 hours, leading to satisfaction with our support.",
		"role" : "assistant"
	},
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here's a summary of our interactions with Jo Blake in the last six months:\r\r- **5/8/2024:** Followed up on pending payment issues. Jo was unaware of the outstanding balance but promised to resolve it within a week.\r- **7/22/2024:** Jo expressed dissatisfaction with shipping times on the last order. We offered a 10% discount on the next purchase to maintain goodwill.\r- **8/15/2024:** We reached out to discuss a new product launch. Jo was interested but is waiting for their fiscal year budget to be finalized before making a commitment.\r- **9/4/2024:** Jo requested assistance with an account issue, which we resolved within 48 hours, resulting in satisfaction with our support.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here's a summary of our contacts with Jo Blake in the last 6 months:\r\r- **May 8, 2024**: Follow-up on pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within the next week.\r- **July 22, 2024**: Jo expressed dissatisfaction with shipping times on the last order. We offered a 10% discount on the next purchase to maintain goodwill.\r- **August 15, 2024**: Discussed the new product launch. Jo showed interest but is waiting for fiscal year budget finalization before making commitments.\r- **September 4, 2024**: Assisted Jo in troubleshooting an account issue, which was resolved within 48 hours. Jo expressed satisfaction with the support provided.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our interactions with Jo Blake over the past six months:\r\r- **May 8, 2024**: Followed up on outstanding payment issues. Jo was unaware of the balance but promised to settle it within a week.\r- **July 22, 2024**: Jo expressed dissatisfaction with shipping times from the last order. We offered a 10% discount on the next purchase as compensation.\r- **August 15, 2024**: Discussed a new product launch. Jo showed interest but is waiting for the fiscal year budget to be finalized before making decisions.\r- **September 4, 2024**: Assisted Jo with an account issue, which was resolved within 48 hours. Jo was satisfied with the support received.",
		"role" : "assistant"
	},
	{
		"content" : "What’s your purpose?",
		"role" : "user"
	},
	{
		"content" : "My purpose is to assist you with various tasks related to the FileMaker QuickStart system by DB Services. I can help you navigate through the system, search for products, create and manage company and contact records, summarize contact notes, send emails, and execute queries on the database. I'm here to streamline your workflow and provide you with the information you need. If there's anything specific you need help with, just let me know!",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our interactions with Jo Blake over the past 6 months:\r\r- **May 8, 2024:** Followed up on pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within the next week.\r  \r- **July 22, 2024:** Jo expressed dissatisfaction with shipping times on the last order. We offered a 10% discount on the next purchase to maintain goodwill.\r  \r- **August 15, 2024:** Reached out to discuss a new product launch. Jo showed interest but mentioned waiting for their fiscal year budget to be finalized before committing.\r  \r- **September 4, 2024:** Jo requested assistance with an account issue, which was resolved within 48 hours, earning customer satisfaction with the support provided.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Test",
		"role" : "user"
	},
	{
		"content" : "Hello! How can I assist you with FileMaker QuickStart today?",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our recent contacts with Jo Blake over the last six months:\r\r- **May 8, 2024:** Followed up on pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within a week.\r- **July 22, 2024:** Jo expressed dissatisfaction with shipping times on their last order. We offered a 10% discount on their next purchase to retain goodwill.\r- **August 15, 2024:** Discussed a new product launch with Jo. They seemed interested but are waiting for their fiscal year budget to be finalized before committing.\r- **September 4, 2024:** Jo requested assistance with troubleshooting an account issue, which was resolved within 48 hours. Jo expressed satisfaction with the support provided.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "Here is a summary of our interactions with Jo Blake over the last six months:\r\r1. **May 8, 2024**: Followed up on pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within the next week.\r\r2. **July 22, 2024**: Jo expressed dissatisfaction with shipping times on their last order. We offered a 10% discount on the next purchase to maintain goodwill.\r\r3. **August 15, 2024**: Discussed a new product launch. Jo showed interest but is waiting for their fiscal year budget to be finalized before committing.\r\r4. **September 4, 2024**: Jo requested assistance with troubleshooting an account issue, which was resolved within 48 hours. Jo expressed satisfaction with the support provided.",
		"role" : "assistant"
	}
],[
	{
		"content" : "Test",
		"role" : "user"
	},
	{
		"content" : "Hello! How can I assist you today?",
		"role" : "assistant"
	},
	{
		"content" : "asdf",
		"role" : "user"
	},
	{
		"content" : "It looks like you entered some random text. How can I assist you with the FileMaker QuickStart today?",
		"role" : "assistant"
	}
],[
	{
		"content" : "Add a contact “Test Sanderson” to the new company “QSA Test\"",
		"role" : "user"
	},
	{
		"content" : "The contact \"Test Sanderson\" has been successfully added to the new company \"QSA Test.\" If you need any more assistance, feel free to ask!",
		"role" : "assistant"
	},
	{
		"content" : "Can you summarize our recent contacts with Jo Blake?",
		"role" : "user"
	},
	{
		"content" : "Here's a summary of our recent contacts with Jo Blake:\r\r- **5/8/2024**: Followed up with Jo regarding pending payment issues. Jo was unaware of the outstanding balance but promised to settle it within a week.\r  \r- **7/22/2024**: Jo expressed dissatisfaction with shipping times on the last order. We offered a 10% discount on their next purchase to retain goodwill.\r  \r- **8/15/2024**: Reached out to discuss our new product launch. Jo showed interest but mentioned they are waiting for their fiscal year budget to be finalized before committing.\r  \r- **9/4/2024**: Jo requested help with troubleshooting an issue with their account. The issue was resolved within 48 hours, and Jo expressed satisfaction with the support provided.\r\rIf there's anything else you need, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "What is the capital of france",
		"role" : "user"
	}
],[
	{
		"content" : "What is the capital of France",
		"role" : "user"
	}
],[
	{
		"content" : "Test",
		"role" : "user"
	},
	{
		"content" : "asdf",
		"role" : "user"
	}
],[
	{
		"content" : "What is the capital of France?",
		"role" : "user"
	}
],[
	{
		"content" : "What kind of AI are you?",
		"role" : "user"
	}
],[
	{
		"content" : "what kind of AI are you?",
		"role" : "user"
	}
],[
	{
		"content" : "Can you tell me a joke?",
		"role" : "user"
	}
],[
	{
		"content" : "Tell me a joke",
		"role" : "user"
	}
],[
	{
		"content" : "tell me your best joke",
		"role" : "user"
	}
],[
	{
		"content" : "tell me your funniest joke",
		"role" : "user"
	}
],[
	{
		"content" : "I wanna hear your funniest joke",
		"role" : "user"
	},
	{
		"content" : "I appreciate your interest, but I'm here to assist you with questions or actions related to FileMaker QuickStart. If there's anything specific you need help with regarding QuickStart, let me know!",
		"role" : "assistant"
	}
],[
	{
		"content" : "What is the capital of France",
		"role" : "user"
	}
],[
	{
		"content" : "This is a test",
		"role" : "user"
	}
],[
	{
		"content" : "What is your purpose",
		"role" : "user"
	}
],[
	{
		"content" : "what is your purpose",
		"role" : "user"
	}
],[
	{
		"content" : "What is your purpose",
		"role" : "user"
	},
	{
		"content" : "I assist with questions and actions related to the FileMaker QuickStart, a starter file distributed by DB Services. If you have any queries regarding QuickStart, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "what is your purpose",
		"role" : "user"
	},
	{
		"content" : "I am here to answer questions and perform actions related to the FileMaker QuickStart, a starter file distributed by DB Services to help users get started with FileMaker. If you have any questions about QuickStart or need assistance with it, feel free to ask!",
		"role" : "assistant"
	},
	{
		"content" : "Can you do anything else?",
		"role" : "user"
	},
	{
		"content" : "I am specifically designed to assist with the FileMaker QuickStart file. My main abilities include answering questions about QuickStart, providing guidance, and performing actions related to it. If there is anything specific you would like to know or do within QuickStart, please let me know!",
		"role" : "assistant"
	},
	{
		"content" : "Summarize our previous chat",
		"role" : "user"
	},
	{
		"content" : "In our previous chat, you asked about my purpose, and I explained that I am here to assist with the FileMaker QuickStart, providing guidance and answering questions related to it. You then inquired if I could do anything else, and I clarified that my main abilities are focused on the QuickStart file. If you have any more questions or need further assistance, feel free to ask!",
		"role" : "assistant"
	}
],[
	{
		"content" : "Summarize our contacts with Jo Blake in the last 6 months",
		"role" : "user"
	},
	{
		"content" : "To summarize the contacts with Jo Blake in the last 6 months, you would need to review the interaction history or communication logs recorded in the system. However, I can't access the database or records directly from the FileMaker QuickStart. You can find this information by navigating to the \"Contacts\" or \"Communication History\" section in the FileMaker QuickStart interface and filtering by Jo Blake to see all related activities. \r\rIf you need help with specific tasks within the QuickStart interface, feel free to ask!",
		"role" : "assistant"
	}
]];
</script>

<style lang="scss" scoped>

	.app-container {
		display: flex;
		max-height: 100vh;
		max-width: 100vw;
		// padding: 0 1rem;
		gap: 3rem;
		background-color: var(--raisin-black);

		.sidebar-container {
			display: flex;
			flex-direction: column;
			padding: 0.5rem;
			width: 20%;
			height: calc(100vh - 1rem);
			// border-radius: 0.75rem;
			border-right: 1px solid black;
			background-color: var(--dark-gunmetal); 
			// box-shadow: 0 0 10px 1px black;
			overflow-y: scroll;

			.chat-log-container {
				display: flex;
				flex-direction: column;
				margin: 1rem 0;
				gap: 0.25rem;
				overflow-y: scroll;

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
			// box-shadow: 0 0 10px 1px black;
			border-radius: 0.75rem;
			// background-color: var(--light-black);
			background-color: var(--raisin-black);

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
				align-items: center;
				position: absolute;
				// bottom: 2rem;
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
					// color: black;

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