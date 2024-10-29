import type { ChatJSON } from "./typeInterfaceDefinitions";

export class ChatLog {
    /* ---------- Private Data ---------- */
    private id: string = ""; // FM Thread ID
    private title: string = ""; // First user prompt
    private chatHistory: ChatJSON[] = []; // History of user prompts and AI responses

    /* ---------- Public Constructor ---------- */
    constructor(chatHistory: ChatJSON[]) {
        this.chatHistory = chatHistory;

        // If there is a chat history, then set the title to the first user prompt
        if (this.chatHistory.length > 0) {
            for (let chat of this.chatHistory) {
                if (chat.role === "user") {
                    this.title = chat.content;
                    break;
                }
            }
        }
        else {
            // Default title if there is no chat history
            this.title = "New Thread";
        }
    }

    /* ---------- Public Getter Methods ---------- */
    public getChatTitle(): string {
        return this.title;
    }

    public getChatHistory(): ChatJSON[] {
        return this.chatHistory;
    }

    public getId(): string {
        return this.id;
    }

    /* ---------- Public Setter Methods ---------- */
    public setChatTitle(chatTitle: string): void {
        this.title = chatTitle;
    }

    public setChatHistory(history: ChatJSON[]) {
        this.chatHistory = history;
    }

    public setId(ID: string) {
        this.id = ID;
    }

    /* ---------- Public Methods ---------- */
    public sendPrompt(userPrompt: ChatJSON) {
        this.chatHistory.push(userPrompt);
        // @ts-ignore
        FileMaker.PerformScript("System - Operate Supervisor Agent", JSON.stringify({ prompt: userPrompt.content }));
    }

    public addAssistantResponse(response: ChatJSON, isLoading?: boolean) {
        // The bouncing ellipsis animation is technically a chat history object, so once the
        // AI responds, we need to find the most recent chat history object, remove it from the history
        // and replace it with the AI response. If the most recent chat history object is a user prompt
        // however, we don't want to do that so that's what the secondary check is
        // Basically, check if we're waiting on the AI response, and if so + the last message in the history
        // is not from the user, then drop that message and replace it with the AI response
        if (!isLoading && this.chatHistory[this.chatHistory.length - 1].role !== "user") {
            this.chatHistory.pop();
        }
        this.chatHistory.push(response);
    }
}