<template id="page-button">
	<component :href="getHref()" :is='tagName' class="is-button" @click="handle($event)" @click.middle="handle($event, true)" @keydown.space="hitSpace" :disabled="running || disabled" :class="[getChildComponentClasses('page-button'), {'is-running': running, 'is-active': active || activated, 'has-tooltip': !!tooltip, 'has-icon': cell.state.icon, 'has-text': cell.state.content}]" 
			:component-group="cell.state.componentGroup"
			:type="cell.state.buttonType ? cell.state.buttonType : guessButtonType()"
			:id="cell.customId ? cell.customId : null">
		<img :src="cell.state.icon.indexOf('http') == 0 ? cell.state.icon : $window.application.configuration.root + 'resources/' + cell.state.icon" v-if="cell.state.icon && cell.state.icon.match(/^.*\.[^.]+$/)" class="is-icon"/>
		<icon :name="cell.state.icon" v-if="cell.state.icon"/>
		<span class="is-text" v-if="cell.state.content && !edit" v-html="$services.page.translate(getContentWithVariables($services.page.interpret(cell.state.content, $self)))"></span>
		<span class="is-text is-inline-editor" v-else-if="edit" 
			v-html-once="cell.state.content ? cell.state.content : null"
			ref="editor"
			@keyup="update" @blur="update" @input="update"
			:contenteditable="true"
			placeholder="Button label"></span>
		<span class="is-badge" v-if="cell.state.badge" v-html="badge" :class="getChildComponentClasses('page-button-badge')"></span>
		<span v-if="tooltip" class="is-tooltip" v-html="tooltip" :class="getChildComponentClasses('page-button-tooltip')"></span>
	</component>
</template>

<template id="page-button-configure">
	<div class="is-column">
		
		<div class="is-column is-spacing-medium">
			<n-form-text v-model="cell.state.icon" label="Icon" :timeout="600"/>
			<n-form-text v-model="cell.state.tooltip" label="Tooltip" :timeout="600"/>
			<n-form-text v-model="cell.state.badge" label="Badge" :timeout="600"/>
			<n-form-switch v-model="cell.state.stopPropagation" label="Stop click propagation"/>
			<n-form-switch v-model="cell.state.emitClose" label="Emit close on click" v-if="false"/>
			
			<n-form-ace v-model="cell.state.content" label="Raw content" mode="html"/>
			
			<n-form-combo label="Activation Type" v-model="cell.state.activationType" :items="['group', 'condition', 'route']"/>
			
			<n-form-text v-model="cell.state.componentGroup" label="Button group" after="You can add this button to a button group which will determine group behavior"
				placeholder="E.g. myTabs"
				v-if="cell.state.activationType == 'group'"
				:timeout="600"/>
				
			<n-form-switch v-model="cell.state.activateByDefault" v-if="cell.state.activationType == 'group' && !cell.state.activeInitial" label="Have this button active by default"/>
			<n-form-ace mode="javascript" v-model="cell.state.activeInitial" label="Start as active if" v-if="cell.state.activationType == 'group' && !cell.state.activateByDefault"/>
			<n-form-ace mode="javascript" v-model="cell.state.active" label="Active if" v-if="cell.state.activationType == 'condition'"/>
			<div v-if="cell.state.activationType == 'route'" class="is-column is-spacing-gap-small">
				<div v-for="(activeRoute, index) in cell.state.activeRoutes" class="is-column is-spacing-medium is-spacing-gap-small has-button-close is-spacing-vertical-top-large is-color-body">
					<n-form-combo v-model="activeRoute.route" 
						:filter="$services.page.getPageRoutes" 
						:formatter="function(x) { return $services.page.prettifyRouteAlias(x.alias) }" 
						:extracter="function(x) { return x.alias }" 
						label="Route"
						key="button-route"/>
					<n-form-text v-model="activeRoute.condition" label="Condition on route parameters"/>
					<button class="is-button is-variant-close is-size-small" @click="cell.state.activeRoutes.splice(index, 1)"><icon name="times"/></button>
				</div>
				<div class="is-row is-align-end">
					<button class="is-button is-variant-primary-outline is-size-xsmall" @click="cell.state.activeRoutes.push({condition:null,route:null})"><icon name="plus"/><span class="is-text">Route</span></button>
				</div>
			</div>
			
			<n-form-ace mode="javascript" v-model="cell.state.disabled" label="Disabled if"/>
			<n-form-combo v-model="cell.state.buttonType" :items="['submit', 'reset', 'button']" label="Button type"/>
			
		</div>
		
		<page-triggerable-configure :page="page" :target="cell.state" :triggers="triggers" :allow-closing="true" v-if="cell.state.triggers && cell.state.triggers.length"/>
		
		<typography-variable-replacer :content="cell.state.content" :container="cell.state" :page="page"/>
	</div>
</template>