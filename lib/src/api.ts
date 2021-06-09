/**
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
    AsgardeoSPAClient,
    AuthClientConfig,
    BasicUserInfo,
    Config,
    CustomGrantConfig,
    DecodedIDTokenPayload,
    Hooks,
    HttpClientInstance,
    HttpRequestConfig,
    HttpResponse,
    OIDCEndpoints,
    SignInConfig
} from "@asgardeo/auth-spa";
import { AuthStateInterface } from "./models";

class AuthAPI {
    static DEFAULT_STATE: AuthStateInterface;

    private _authState = AuthAPI.DEFAULT_STATE;
    private _client: AsgardeoSPAClient;

    constructor() {
        this._client = AsgardeoSPAClient.getInstance();

        this.getState = this.getState.bind(this);
        this.init = this.init.bind(this);
        this.signIn = this.signIn.bind(this);
        this.signOut = this.signOut.bind(this);
        this.updateState = this.updateState.bind(this);
    }

    /**
     * Method to return Auth Client instance authentication state.
     *
     * @return {AuthStateInterface} Authentication State.
     */
    public getState(): AuthStateInterface {
        return this._authState;
    }

    /**
     * Method to initialize the AuthClient instance.
     *
     * @param {Config} config - `dispatch` function from React Auth Context.
     */
    public init(config: AuthClientConfig<Config>): Promise<boolean> {
        return this._client.initialize(config);
    }

    /**
     * Method to handle user Sign In requests.
     *
     * @param {any} dispatch - `dispatch` function from React Auth Context.
     * @param {AuthStateInterface} state - Current authentication state in React Auth Context.
     * @param {any} callback - Action to trigger on successful sign in.
     */
    public async signIn(
        dispatch: (state: AuthStateInterface) => void,
        state: AuthStateInterface,
        config: SignInConfig,
        authorizationCode: string,
        sessionState: string,
        callback?: (response: BasicUserInfo) => void
    ): Promise<void> {
        this._client.on(Hooks.SignIn, (response) => {
            const stateToUpdate = {
                allowedScopes: response.allowedScopes,
                displayName: response.displayName,
                email: response.email,
                isAuthenticated: true,
                username: response.username
            };

            this.updateState(stateToUpdate);

            dispatch({ ...state, ...stateToUpdate });

            if (callback) {
                callback(response);
            }
        });
        await this._client.signIn(config, authorizationCode, sessionState);
    }

    /**
     * Method to handle user Sign Out requests.
     *
     * @param {any} dispatch - `dispatch` function from React Auth Context.
     * @param {AuthStateInterface} state - Current authentication state in React Auth Context.
     * @param {any} callback - Action to trigger on successful sign out.
     */
    public signOut(
        dispatch: (state: AuthStateInterface) => void,
        state: AuthStateInterface,
        callback?: () => void
    ): void {
        this._client.on(Hooks.SignOut, () => {
            const stateToUpdate = AuthAPI.DEFAULT_STATE;

            this.updateState(stateToUpdate);

            dispatch({ ...state, ...stateToUpdate });

            if (callback) {
                callback();
            }
        });

        this._client.signOut();
    }

    /**
     * Method to update Auth Client instance authentication state.
     *
     * @param {AuthStateInterface} state - State values to update in authentication state.
     */
    public updateState(state: AuthStateInterface): void {
        this._authState = { ...this._authState, ...state };
    }

    /**
     * This method returns a Promise that resolves with the basic user information obtained from the ID token.
     *
     * @return {Promise<BasicUserInfo>} - A promise that resolves with the user information.
     */
    public async getBasicUserInfo(): Promise<BasicUserInfo> {
        return this._client.getBasicUserInfo();
    }

    /**
     * This method sends an API request to a protected endpoint.
     * The access token is automatically attached to the header of the request.
     * This is the only way by which protected endpoints can be accessed
     * when the web worker is used to store session information.
     *
     * @param {HttpRequestConfig} config -  The config object containing attributes necessary to send a request.
     *
     * @return {Promise<HttpResponse>} - Returns a Promise that resolves with the response to the request.
     */
    public async httpRequest(config: HttpRequestConfig): Promise<HttpResponse<any>> {
        return this._client.httpRequest(config);
    }

    /**
     * This method sends multiple API requests to a protected endpoint.
     * The access token is automatically attached to the header of the request.
     * This is the only way by which multiple requests can be sent to protected endpoints
     * when the web worker is used to store session information.
     *
     * @param {HttpRequestConfig[]} config -  The config object containing attributes necessary to send a request.
     *
     * @return {Promise<HttpResponse[]>} - Returns a Promise that resolves with the responses to the requests.
     */
    public async httpRequestAll(configs: HttpRequestConfig[]): Promise<HttpResponse<any>[]> {
        return this._client.httpRequestAll(configs);
    }

    /**
     * This method allows you to send a request with a custom grant.
     *
     * @param {CustomGrantRequestParams} config - The request parameters.
     *
     * @return {Promise<HttpResponse<any> | SignInResponse>} - A Promise that resolves with
     * the value returned by the custom grant request.
     */
    public requestCustomGrant(
        config: CustomGrantConfig,
        callback: (response: BasicUserInfo | HttpResponse<any>) => void,
        dispatch: (state: AuthStateInterface) => void
    ): void {
        this._client.on(
            Hooks.CustomGrant,
            (response: BasicUserInfo | HttpResponse<any>) => {
                if (config.returnsSession) {
                    dispatch({ ...(response as BasicUserInfo), isAuthenticated: true });
                }

                callback && callback(response);
            },
            config.id
        );
        this._client.requestCustomGrant(config);
    }

    /**
     * This method ends a user session. The access token is revoked and the session information is destroyed.
     *
     * @return {Promise<boolean>} - A promise that resolves with `true` if the process is successful.
     */
    public async revokeAccessToken(dispatch: (state: AuthStateInterface) => void): Promise<boolean> {
        return this._client.revokeAccessToken().then(() => {
            dispatch(AuthAPI.DEFAULT_STATE);
            return true;
        });
    }

    /**
     * This method returns a Promise that resolves with an object containing the service endpoints.
     *
     * @return {Promise<ServiceResourcesType} - A Promise that resolves with an object containing the service endpoints.
     */
    public async getOIDCServiceEndpoints(): Promise<OIDCEndpoints> {
        return this._client.getOIDCServiceEndpoints();
    }

    /**
     * This methods returns the Axios http client.
     *
     * @return {HttpClientInstance} - The Axios HTTP client.
     */
    public async getHttpClient(): Promise<HttpClientInstance> {
        return this._client.getHttpClient();
    }

    /**
     * This method decodes the payload of the id token and returns it.
     *
     * @return {Promise<DecodedIDTokenPayloadInterface>} - A Promise that resolves with
     * the decoded payload of the id token.
     */
    public async getDecodedIDToken(): Promise<DecodedIDTokenPayload> {
        return this._client.getDecodedIDToken();
    }

    /**
     * This method returns the ID token.
     *
     * @return {Promise<string>} - A Promise that resolves with the id token.
     */
    public async getIDToken(): Promise<string> {
        return this._client.getIDToken();
    }

    /**
     * This method return a Promise that resolves with the access token.
     *
     * **This method will not return the access token if the storage type is set to `webWorker`.**
     *
     * @return {Promise<string>} - A Promise that resolves with the access token.
     */
    public async getAccessToken(): Promise<string> {
        return this._client.getAccessToken();
    }

    /**
     * This method refreshes the access token.
     *
     * @return {TokenResponseInterface} - A Promise that resolves with an object containing
     * information about the refreshed access token.
     */
    public async refreshAccessToken(): Promise<BasicUserInfo> {
        return this._client.refreshAccessToken();
    }

    /**
     * This method specifies if the user is authenticated or not.
     *
     * @return {Promise<boolean>} - A Promise that resolves with `true` if teh user is authenticated.
     */
    public async isAuthenticated(): Promise<boolean> {
        return this._client.isAuthenticated();
    }

    /**
     * This method enables callback functions attached to the http client.
     *
     * @return {Promise<boolean>} - A promise that resolves with True.
     *
     */
    public async enableHttpHandler(): Promise<boolean> {
        return this._client.enableHttpHandler();
    }

    /**
     * This method disables callback functions attached to the http client.
     *
     * @return {Promise<boolean>} - A promise that resolves with True.
     */
    public async disableHttpHandler(): Promise<boolean> {
        return this._client.disableHttpHandler();
    }

    /**
     * This method updates the configuration that was passed into the constructor when instantiating this class.
     *
     * @param {Partial<AuthClientConfig<T>>} config - A config object to update the SDK configurations with.
     */
    public async updateConfig(config: Partial<AuthClientConfig<Config>>): Promise<void> {
        return this._client.updateConfig(config);
    }

    /**
     * This method attaches a callback function to an event hook that fires the callback when the event happens.
     *
     * @param {Hooks.CustomGrant} hook - The name of the hook.
     * @param {(response?: any) => void} callback - The callback function.
     * @param {string} id (optional) - The id of the hook. This is used when multiple custom grants are used.
     *
     */
    public on(hook: Hooks.CustomGrant, callback: (response?: any) => void, id: string): Promise<void>;
    public on(
        hook:
            | Hooks.RevokeAccessToken
            | Hooks.HttpRequestError
            | Hooks.HttpRequestFinish
            | Hooks.HttpRequestStart
            | Hooks.HttpRequestSuccess
            | Hooks.Initialize
            | Hooks.SignIn
            | Hooks.SignOut,
        callback: (response?: any) => void
    ): Promise<void>;
    public on(hook: Hooks, callback: (response?: any) => void, id?: string): Promise<void> {
        if (hook === Hooks.CustomGrant) {
            return this._client.on(hook, callback, id);
        }

        return this._client.on(hook, callback);
    }
}

AuthAPI.DEFAULT_STATE = {
    allowedScopes: "",
    displayName: "",
    email: "",
    isAuthenticated: false,
    username: ""
};

export default AuthAPI;