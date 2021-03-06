/*
 * 	BSD 3-Clause License
 *
 * Copyright (c) 2019, NTT Ltd.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import Report from "./report";
import axios from "axios";

export default class ReportHTTP extends Report {

    constructor(channels, params, env) {
        super(channels, params, env);

        this.name = "reportHTTP" || this.params.name;
        this.enabled = true;
        if (!this.params.hooks || !Object.keys(this.params.hooks).length){
            this.logger.log({
                level: 'error',
                message: `${this.name} reporting is not enabled: no group is defined`
            });
            this.enabled = false;
        } else {
            if (!this.params.hooks["default"]) {
                this.logger.log({
                    level: 'error',
                    message: `In hooks, for ${this.name}, a group named 'default' is required for communications to the admin.`
                });
            }
        }

        this.headers = this.params.headers || {};
        if (this.params.isTemplateJSON) {
            this.headers["Content-Type"] = "application/json";
        }
    }


    _getMessage = (channel, content) => {
        return this.parseTemplate(this.params.templates[channel] || this.params.templates["default"], this.getContext(channel, content));
    };

    _sendHTTPMessage = (url, channel, content) => {
        content = JSON.parse(JSON.stringify(content));
        if (this.params.showPaths > 0) {
            content.message += `${content.message}. Top ${context.pathNumber} most used AS paths: \n ${context.paths}`;
        }

        const blob = this._getMessage(channel, content);

        axios({
            url: url,
            method: "POST",
            headers: this.headers,
            data: (this.params.isTemplateJSON) ? JSON.parse(blob) : blob
        })
            .catch((error) => {
                this.logger.log({
                    level: 'error',
                    message: error
                });
            })
    };

    report = (channel, content) => {
        if (this.enabled) {
            let groups = content.data.map(i => i.matchedRule.group).filter(i => i != null);

            groups = (groups.length) ? [...new Set(groups)] : Object.keys(this.params.hooks); // If there are no groups defined, send to all of them

            for (let group of groups) {
                if (this.params.hooks[group]) {
                    this._sendHTTPMessage(this.params.hooks[group], channel, content);
                }
            }
        }

    }
}