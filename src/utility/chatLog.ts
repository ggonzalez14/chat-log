import type { ChatJSON } from "./typeInterfaceDefinitions";

export class ChatLog {
    /* ---------- Private Data ---------- */
    private id: string = "";
    private title: string = "";
    private chatHistory: ChatJSON[] = [];

    /* ---------- Public Constructor ---------- */
    constructor(chatHistory: ChatJSON[]) {
        this.chatHistory = chatHistory;
        if (this.chatHistory.length > 0) {
            for (let chat of this.chatHistory) {
                if (chat.role === "user") {
                    this.title = chat.content;
                    break;
                }
            }
        }
        else {
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
        if (!isLoading && this.chatHistory[this.chatHistory.length - 1].role !== "user") {
            this.chatHistory.pop();
        }
        this.chatHistory.push(response);
    }
}