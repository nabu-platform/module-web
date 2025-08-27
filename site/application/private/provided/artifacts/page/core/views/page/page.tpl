<template id="nabu-optimized-page-column">
	<n-page-row 
		v-fragment
		:row="page.content.rows[0]"
		:page="page" 
		:edit="edit"
		:depth="0"
		:parameters="parameters"
		:ref="page.name + '_rows'"
		:root="true"
		:page-instance-id="pageInstanceId"
		:stop-rerender="stopRerender"
		:key="'page_' + pageInstanceId + '_row_' + page.content.rows[0].id"
		@update="updateEvent"
		@select="selectItem"
		@viewComponents="viewComponents = edit"
		@removeRow="function(x) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { page.content.rows.splice(page.content.rows.indexOf(x), 1) }) }"/>
</template>

<template id="page-shortkey">
	<span class="shortkey is-badge"><span v-if="ctrl && $window.navigator.platform.toLowerCase().indexOf('mac') >= 0">CMD + </span><span v-else-if="ctrl">CTRL + </span><span v-if="alt">ALT + </span><slot></slot></span>
</template>

<template id="nabu-optimized-page">
	<n-page-row 
		@update="updateEvent"
		:row="page.content.rows[0]"
		:page="page" 
		:edit="edit"
		:depth="0"
		:parameters="parameters"
		:ref="page.name + '_rows'"
		:root="true"
		:page-instance-id="pageInstanceId"
		:stop-rerender="stopRerender"
		:key="'page_' + pageInstanceId + '_row_' + page.content.rows[0].id"
		@select="selectItem"
		@viewComponents="viewComponents = edit"
		@removeRow="function(x) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { page.content.rows.splice(page.content.rows.indexOf(x), 1) }) }"/>
</template>

<template id="nabu-page">
	<component :edit="edit" :is="pageTag()" :inline-all="true" class="is-page is-grid" :body-class="bodyClasses" :page="page.name" 
			@update="updateEvent"
			@drop="dropMenu($event)" @dragover="dragOver($event)"
			:class="[classes, getGridClasses()]"
			>
		<div class="is-page-edit-menu" v-if="false && !page.content.readOnly && $services.page.canEdit() && $services.page.wantEdit && !embedded && !$services.page.editing" 
				:draggable="true" 
				@dragstart="dragMenu($event)"
				:class="{'is-bookmarkable': !!page.content.path}"
				:style="{'top': page.content.menuY ? page.content.menuY + 'px' : '0px', 'left': page.content.menuX ? page.content.menuX + 'px' : '0px'}">
			<span>{{page.name}}</span>
			<button class="is-button is-variant-ghost is-size-xsmall" v-if="page.content.path && hasConfigureListener()" @click="triggerConfiguration()"><icon name="cog"/></button>
			<button class="is-button is-variant-ghost is-size-xsmall" @click="goIntoEdit"><icon name="pencil-alt"/></button>
			<button class="is-button is-variant-ghost is-size-xsmall" @click="$services.router.route('pages')"><icon name="copy"/></button>
			<button v-if="page.content.path && $services.language && $services.language.available.length" class="is-button language-selector is-variant-ghost">
				<span class="current">{{hasLanguageSet() ? $services.language.current.name : "none"}}</span>
				<div class="options">
					<span v-for="language in $services.language.available" @click="$services.language.current = language">{{language.name}}</span>
					<span v-if="$services.language.current && ${environment('development')}" @click="$services.language.current = null">unset</span>
				</div>
			</button>
			<button class="is-button is-variant-ghost is-size-xsmall" @click="$window.console.log('Page: ' + page.name, $self.variables, $self)"><icon name="terminal"/></button>
			<button class="is-button is-variant-ghost is-size-xsmall" v-if="$services.page.disableReload" @click="$services.page.disableReload = false"><icon name="sync"/></button>
			<button class="is-button is-variant-ghost is-size-xsmall" v-else @click="$services.page.disableReload = true"><icon name="ban"/></button>
		</div>
		
		<n-sidebar v-if="edit && page.content.rows" position="left" class="is-header-size-xlarge is-page-editing" :class="{'is-page-editing-large': !collapsedMenu, 'is-page-editing-small': collapsedMenu}" :inline="true" :autocloseable="false" ref="sidemenu"
				@close="stopEdit">
			<template v-if="!collapsedMenu">
				<div class="is-column is-spacing-medium is-align-left is-spacing-vertical-gap-small" slot="header">
						<h3 class="is-h3 is-color-neutral">
							<div class="is-row is-spacing-horizontal-gap-medium is-align-center">
								{{page.content.label ? page.content.label : page.content.name}}
								<ul class="is-menu is-variant-toolbar">
									<li class="is-column"><button class="is-button is-variant-primary-outline is-size-xsmall" @click="save"><span class="is-text">Save</span></button></li>
									<li class="is-column"><button class="is-button is-variant-secondary-outline is-size-xsmall" @click="updateTemplates"><span class="is-text">Update Templates</span></button></li>
								</ul>
							</div>
						</h3>
						<p class="is-p is-size-xsmall">Last saved: {{saved ? $services.formatter.date(saved, 'HH:mm:ss') : 'never' }}</p>
					
					
					<ul class="is-menu is-variant-toolbar">
						<li class="is-column"><button class="is-button is-variant-secondary-outline is-size-small is-border-underline" @click="activeTab = 'layout'" :class="{'is-active': activeTab == 'layout'}"><icon name="align-left"/><span class="is-text">Layout</span></button></li>
						<li class="is-column"><button class="is-button is-variant-secondary-outline is-size-small is-border-underline" @click="activeTab = 'settings'" :class="{'is-active': activeTab == 'settings'}"><icon name="cog"/><span class="is-text">Page</span></button></li>
						<li class="is-column"><button class="is-button is-variant-secondary-outline is-size-small is-border-underline" @click="activeTab = 'components'" :class="{'is-active': activeTab == 'components'}"><icon name="cubes"/><span class="is-text">Content</span></button></li>
						<li class="is-column" v-if="cell || row"><button class="is-button is-variant-primary-outline is-size-small is-border-underline" @click="activeTab = 'selected'" :class="{'is-active': activeTab == 'selected'}"><icon name="cube"/>
							<span class="is-text" v-if="true">{{$services.page.formatPageItem($self, selectedType == 'cell' ? cell : row)}}</span>
							<span class="is-text" v-else-if="selectedType == 'cell' && cell && cell.name">{{cell.name}}</span>
							<span class="is-text" v-else-if="selectedType == 'cell' && cell && cell.alias">{{$services.page.prettifyRouteAlias(cell.alias)}}</span>
							<span class="is-text" v-else-if="selectedType == 'row' && row && row.name">{{row.name}}</span>
							<span class="is-text" v-else>Selected {{selectedType == 'cell' ? "cell" : "row"}}</span></button>
						</li>
					</ul>
				</div>
			</template>
			<template v-else>

			</template>
			<div class="is-row">
				<div class="is-column is-width-fixed-3 is-column is-align-cross-center is-align-main-start is-page-editing-small-menu is-spacing-gap-small">
					<div class="is-column is-spacing-vertical-medium is-spacing-gap-small">
						<button class="is-button is-size-small has-tooltip" @click="stopEdit"><icon name="times"/><span class="is-tooltip is-position-bottom">Stop editing <shortkey :ctrl="true">E</shortkey></span></button>
						<button class="is-button is-size-small has-tooltip" @click="save"><icon name="save"/><span class="is-tooltip is-position-bottom">Last saved: {{saved ? $services.formatter.date(saved, 'HH:mm:ss') : 'never' }}<shortkey :ctrl="true">S</shortkey></span></button>
					</div>
					<div class="is-column is-spacing-vertical-medium is-spacing-gap-small">
						<button class="is-button is-size-small has-tooltip" @click="activeTab = 'layout'" :class="{'is-active': activeTab == 'layout'}"><icon name="align-left"/><span class="is-tooltip">Layout<shortkey :ctrl="true">D</shortkey></span></button>
						<button class="is-button is-size-small has-tooltip" @click="activeTab = 'settings'" :class="{'is-active': activeTab == 'settings'}"><icon name="file"/><span class="is-tooltip">Page Settings<shortkey :ctrl="true">B</shortkey></span></button>
						<button class="is-button is-size-small has-tooltip" @click="activeTab = 'components'" :class="{'is-active': activeTab == 'components'}"><icon name="cubes"/><span class="is-tooltip">Components and operations</span></button>
						<button :disabled="cell == null && row == null" class="is-button is-size-small has-tooltip" @click="activeTab = 'selected'" :class="{'is-active': activeTab == 'selected'}"><icon name="cube"/><span v-if="cell != null || row != null" class="is-tooltip">{{$services.page.formatPageItem($self, selectedType == 'cell' ? cell : row)}}<shortkey :ctrl="true">G</shortkey></span><span v-else class="is-tooltip">Select an component on the page</span></button>
					</div>
					<div class="is-column is-spacing-vertical-medium is-spacing-gap-small">
						<button class="is-button is-size-small has-tooltip" @click="stopEdit(); $services.router.route('pages')"><icon name="copy"/><span class="is-tooltip">View all pages</span></button>
						<button class="is-button is-size-small has-tooltip" @click="updateTemplates"><icon name="upload"/><span class="is-tooltip">Update all templates in page</span></button>
					</div>
					<div class="is-column is-spacing-vertical-medium is-spacing-gap-small bottom-container">
						<div class="page-name">{{page.content.label ? page.content.label : page.content.name}}</div>
						<button class="is-button is-size-xsmall has-tooltip collapser" @click="collapsedMenu = !collapsedMenu"><icon :name="collapsedMenu ? 'chevron-right' : 'chevron-left'"/><span class="is-tooltip">{{collapsedMenu ? 'Expand toolbar' : 'Collapse toolbar'}}</span></button>
					</div>
				</div>
				<div v-show="!collapsedMenu" class="is-column is-fill-normal menu-content">
					<div class="is-row is-spacing-vertical-small is-spacing-medium is-spacing-gap-xsmall is-wrap-wrap breadcrumbs" v-if="selectedItemPath.length && $services.page.showBreadcrumbs">
						<button v-for="(single, singleIndex) in selectedItemPath" class="is-button is-size-xsmall" :class="{'has-renderer': single.renderer, 'is-active': (selectedType == 'cell' && cell == single) || (selectedType == 'row' && row == single)}"
							@click="selectTarget(single)"><span class="is-text">{{$services.page.formatPageItem($self, single)}}</span><span class="is-tag is-size-xxsmall" :class="{'is-variant-primary': single.renderer, 'is-variant-primary-outline': !single.renderer}">{{singleIndex + 1}}</span></button>
					</div>
					
					<div v-show="edit && page.content.rows && activeTab  == 'layout'" class="layout">
						<div class="tabbed-menu is-row is-spacing-xsmall is-spacing-vertical-bottom-none">
							<button class="is-button is-size-xsmall">Layout</button>
						</div>
						<page-sidemenu :rows="page.content.rows" :page="page"
							:selected="cell ? cell : row"
							@select="selectItem"
							@removeRow="function(row) { $confirm({title: 'Delete row', message:'Are you sure you want to delete this row?'}).then(function() { page.content.rows.splice(page.content.rows.indexOf(row), 1) }) }"/>
						<ul class="is-menu is-variant-toolbar is-align-end is-spacing-vertical-medium is-spacing-horizontal-right-small">
							<li class="is-column" v-if="$services.page.copiedRow"><button class="is-button is-variant-warning is-size-xsmall" @click="pasteRow()"><icon name="paste"/><span class="is-text">Paste copied row</span></button></li>
							<li class="is-column"><button class="is-button is-variant-primary is-size-xsmall" @click="addRow(page.content)"><icon name="plus"/><span class="is-text">New row</span></button></li>
						</ul>
					</div>
					<div v-if="activeTab == 'settings'">
						<div class="tabbed-menu is-row is-spacing-xsmall is-spacing-vertical-bottom-none">
							<button @click="$services.page.activeSubTab = 'component'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'component'}">Page</button>
							<button @click="$services.page.activeSubTab = 'container'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'container'}">Misc</button>
							<button @click="$services.page.activeSubTab = 'variables'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'variables'}">Variables</button>
							<button @click="$services.page.activeSubTab = 'styling'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'styling'}">Styling</button>
							<button @click="$services.page.activeSubTab = 'triggers'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'triggers'}">Triggers</button>
							<button @click="$services.page.activeSubTab = 'analysis'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'analysis'}">Analysis</button>
						</div>
						<n-form class="is-variant-floating-labels">
							<template v-if="$services.page.activeSubTab == 'component'">
								<h2 class="section-title">Routing</h2>
								<div class="is-column is-spacing-medium">	
									<p class="is-p is-size-small is-color-light">These settings will determine how the page is routed throughout the application.</p>
									<n-form-text v-model="page.content.category" label="Category" info="The category this page belongs to"/>
									<n-form-text v-model="page.content.path" label="Path" info="The path this page can be found on, if you don't want to expose it via a dedicated path, leave this empty.<br/><br/> You can use the following syntax to define path variables:<br/>/path/to/{myVariable}/is"/>
									<n-form-text v-model="page.content.title" label="Title" info="You can fill in a custom application title that will appear when this page is routed"/>
									<n-form-combo label="Page Parent" :filter="$services.page.getParentRoutes" v-model="page.content.pageParent"
										empty-value="No available parents"/>
									<n-form-text v-model="page.content.defaultAnchor" label="Content Anchor"
										after="Choose the parent page in which this page is nested by default when the user browses to it"/>
									<n-form-text v-model="page.content.autoRefresh" label="Auto-refresh"/>
									<n-form-switch label="Is slow" v-if="!page.content.initial" v-model="page.content.slow" after="If the route is slow, we can render a loading icon"/>
									<n-form-switch label="Route Error in Self" v-model="page.content.errorInSelf" after="If you check this, the error page will be routed in the element that this page appears in"/>
								</div>
								<h2 class="section-title">Security</h2>
								<div class="is-column is-spacing-medium">
									<p class="is-p is-size-small is-color-light">You can configure additional security on a page to limit access. If nothing is configured, everyone is allowed. You can use pseudo roles like $user and $guest.</p>
									
									<n-form-switch v-model="page.content.useFixedServiceContext" label="Use fixed service context"/>
									<n-form-combo v-model="page.content.serviceContext" v-if="!page.content.useFixedServiceContext" label="Service Context Variable"
										:filter="$services.page.filterPageStartupParameters.bind($self, page)"/>
									<n-form-text v-model="page.content.fixedServiceContext" label="Fixed service context" v-else/>
									
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="page.content.roles ? page.content.roles.push('') : $window.Vue.set(page.content, 'roles', [''])"><icon name="plus"/>Role</button>
									</div>
									<div v-if="page.content.roles">
										<div v-for="i in Object.keys(page.content.roles)" class="has-button-close">
											<n-form-text v-model="page.content.roles[i]" placeholder="Role e.g. $user, $guest, ..." :timeout="600"/>
											<button class="is-button is-variant-close is-size-small" @click="page.content.roles.splice(i, 1)"><icon name="times"/></button>
										</div>
									</div>
								</div>
								<h2 class="section-title">Branding</h2>
								<div class="is-column is-spacing-medium">
									<div class="is-row is-align-end" v-if="!page.content.branding">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="$window.Vue.set(page.content, 'branding', {})">Enable Page Branding</button>
									</div>
									<div v-else class="is-column is-spacing-vertical-gap-medium">
										<div class="is-row is-align-end">
											<button class="is-button is-variant-danger-outline is-size-xsmall" @click="$window.Vue.set(page.content, 'branding', null)">Disable Page Branding</button>
										</div>
										<n-form-text v-model="page.content.branding.siteName" label="The name of your application" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="page.content.branding.favicon" placeholder="/resources/images/logo.png" label="The location of the favicon" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="page.content.branding.title" :placeholder="$services.page.title" label="The meta title for your application" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="page.content.branding.description" label="The meta description for your application" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="page.content.branding.image" placeholder="/resources/images/hero.png" label="The meta image for your application" info="Minimum 1200×630 pixels, max 1mb" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="page.content.branding.imageAlt" label="Alternative text for your main image" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="page.content.branding.facebookAppId" label="Your facebook app id" info="Mostly interesting for analytics" placeholder="your_app_id" :timeout="600" @input="$services.page.saveConfiguration"/>
										<n-form-text v-model="page.content.branding.twitterUserName" placeholder="@website-username" info="Mostly interesting for analytics" label="Your facebook app id" :timeout="600" @input="$services.page.saveConfiguration"/>
									</div>
								</div>
							</template>
							<template v-if="$services.page.activeSubTab == 'container'">
								<h2 class="section-title">Formatters</h2>
								<div class="is-column is-spacing-medium">	
									<n-collapsible :only-one-open="true" v-for="(formatter, index) in page.content.formatters" :title="formatter.name ? formatter.name : 'Unnamed'" content-class="is-spacing-medium">
										<ul slot="buttons" class="is-menu is-variant-toolbar is-spacing-horizontal-right-small">
											<li class="is-column"><button class="is-button is-size-xsmall is-variant-danger-outline" @click="page.content.formatters.splice(index, 1)"><icon name="times"/></button></li>
										</ul>
										<n-form-text v-model="formatter.name" label="Name"/>
										<n-form-switch v-model="formatter.global" label="Global" v-if="false"/>
										<n-form-ace v-model="formatter.script" label="Script"  mode="javascript"/>
									</n-collapsible>
									<div class="is-row is-align-end is-spacing-horizontal-right-small">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="page.content.formatters.push({})"><icon name="plus"/><span class="is-text">Formatter</span></button>
									</div>
								</div>
								<h2 class="section-title">Plugins</h2>
								<component v-for="plugin in plugins" :is="plugin.configure" 
									:page="page" 
									:edit="edit"/>
								<div class="is-column is-spacing-medium" v-if="!plugins.length">	
									No plugins found
								</div>
							</template>
							<template v-if="$services.page.activeSubTab == 'variables'">
								<h2 class="section-title">Path</h2>
								<div class="is-column is-spacing-medium">
									<p class="is-p is-size-small is-color-light">Path variables can be defined in the 'path' under 'General Settings'. Use {} syntax to denote variable parts. Path variables are bookmarkable.</p>
									<p class="is-p is-size-small is-color-danger-outline" v-if="!$services.page.pathParameters(page.content.path).length">No variables found in the current path.</p>
									<p class="is-p is-size-small is-color-success-outline" v-else>Found the following path variables: {{$services.page.pathParameters(page.content.path).join(", ")}}</p>
								</div>
								<h2 class="section-title">Query</h2>
								<div class="is-column is-spacing-medium">
									<p class="is-p is-size-small is-color-light">You can use query variables to feed input values to your page from another page or another application. Query variables are bookmarkable.</p>
									<div class="is-row is-align-end">
										<button class="is-button is-color-primary-outline is-size-xsmall" @click="page.content.query.push(null)"><icon name="plus"/>New query parameter</button>
									</div>
									<div v-if="page.content.query && page.content.query.length" class="is-column is-spacing-gap-small">
										<div v-for="i in Object.keys(page.content.query)" class="has-button-close">
											<n-form-text v-model="page.content.query[i]" :timeout="600" placeholder="Name of the parameter"/>
											<button @click="removeQuery(i)" class="is-button is-variant-close is-size-small"><icon name="times"/></button>
										</div>
									</div>
								</div>
								<h2 class="section-title">Internal</h2>
								<div class="is-column is-spacing-medium">
									<p class="is-p is-size-small is-color-light">You can use internal variables to store data that you capture.</p>
									<div class="is-row is-align-end">
										<button class="is-button is-color-primary-outline is-size-xsmall" @click="addPageParameter"><icon name="plus"/>New internal parameter</button>
									</div>
								</div>
								<div class="is-accordion" v-if="page.content.parameters">
									<n-collapsible :only-one-open="true" class="is-color-primary-light" v-for="parameter in page.content.parameters" :title="parameter.name ? parameter.name : 'unnamed'" after="Internal">
										<ul slot="buttons" class="is-menu is-variant-toolbar is-spacing-horizontal-right-small">
											<li class="is-column"><button class="is-button is-size-xsmall is-variant-primary-outline" @click="moveInternalUp(parameter)"><icon name="chevron-circle-up"/></button></li>
											<li class="is-column"><button class="is-button is-size-xsmall is-variant-primary-outline" @click="moveInternalDown(parameter)"><icon name="chevron-circle-down"/></button></li>
											<li class="is-column"><button class="is-button is-size-xsmall is-variant-danger-outline" @click="page.content.parameters.splice(page.content.parameters.indexOf(parameter), 1)"><icon name="times"/></button></li>
										</ul>
										<div class="is-column is-spacing-medium">
											<n-form-text v-model="parameter.name" :required="true" label="Name" :timeout="600"/>
											<n-form-switch v-model="parameter.private" label="Private parameter"/>
											<n-form-combo v-if="!parameter.useDefinition" v-model="parameter.type" label="Type" :filter="getParameterTypes" :placeholder="parameter.template ? 'Calculated from template' : (parameter.default || parameter.defaultScript ? 'Calculated from default' : 'string')"/>
											<n-form-combo v-if="false" v-model="parameter.type" label="Type" :filter="getParameterTypes" :placeholder="parameter.template ? 'Calculated from template' : (parameter.default || parameter.defaultScript ? 'Calculated from default' : 'string')"/>
											<n-form-switch v-model="parameter.isArray" v-if="parameter.type" label="Is an array"/>
											<n-form-combo v-model="parameter.format" label="Format" v-if="parameter.type == 'string'" :items="['date-time', 'uuid', 'uri', 'date', 'password']"/>
											<n-form-text v-model="parameter.default" label="Default Value" v-if="!parameter.complexDefault && (!parameter.defaults || !parameter.defaults.length)"/>
											<n-form-switch v-model="parameter.complexDefault" label="Use script for default value"/>
											<n-form-ace mode="javascript" v-model="parameter.defaultScript" label="Default Value" v-if="parameter.complexDefault && (!parameter.defaults || !parameter.defaults.length)" @input="initializeDefaultParameters(true, [parameter.name], true)"/>
											<p class="is-p is-size-small is-color-light" v-if="(parameter.default || parameter.defaultScript) && !parameter.private">Note that public variables can not be recalculated through the refresh state action</p>
											<p class="is-p is-size-small is-color-light" v-if="(parameter.default || parameter.defaultScript) && parameter.private">Private default values can be recalculated using the refresh state action</p>
											<n-form-text v-if="!parameter.useDefinition && (!parameter.defaults || !parameter.defaults.length)" v-model="parameter.template" label="Template Value" after="You can use a template to determine the data type"/>
											<n-form-switch v-if="!parameter.type && !parameter.template" v-model="parameter.useDefinition" label="Use type definition" after="You can add a custom JSON schema definition for this variable"/>
											<n-form-ace v-if="parameter.useDefinition" v-model="parameter.definition" label="JSON Schema"/>
											
											<div v-if="parameter.type && parameter.type.indexOf('.') > 0 && !parameter.default">
												<h4 class="is-h4">Default Values</h4>
												<p class="is-p is-size-small is-color-light">You can set separate default values for particular fields.</p>
												<div class="is-row is-align-end">
													<button class="is-button is-variant-primary-outline is-size-xsmall" @click="parameter.defaults ? parameter.defaults.push({query:null,value:null}) : $window.Vue.set(parameter, 'defaults', [{query:null,value:null}])"><icon name="plus"/>Default Value</button>
												</div>
												<div v-if="parameter.defaults">
													<n-form-section class="is-column is-spacing-medium has-button-close is-color-body" v-for="defaultValue in parameter.defaults">
														<n-form-combo v-model="defaultValue.query" placeholder="Query" :filter="listFields.bind($self, parameter.type)"/>
														<n-form-text v-model="defaultValue.value" placeholder='Value'/>
														<button class="is-button is-variant-close is-size-small" @click="parameter.defaults.splice(parameter.defaults.indexOf(defaultValue), 1)"><icon name="times"/></button>
													</n-form-section>
												</div>
											</div>
											<n-form-switch v-if="false" v-model="parameter.global" label="Is translation global?"/>
											<n-form-switch v-model="parameter.store" label="Store in browser"/>
											<n-form-switch v-model="parameter.emitUpdate" label="Emit to parent"/>
										</div>
										<page-triggerable-configure :page="page" :target="parameter" :triggers="getStateEvents()"/>
									</n-collapsible>
								</div>
								<h2 class="section-title">External</h2>
								<div class="is-column is-spacing-medium">
									<p class="is-p is-size-small is-color-light">You can add additional data from the backend or the application to this page. For example when building a detail view of an item, you can retrieve all the necessary information based on an id that you get from the path.</p>
									<ul class="is-menu is-variant-toolbar is-align-end">
										<li class="is-column"><button class="is-button is-color-primary-outline is-size-xsmall has-tooltip" @click="addState"><icon name="plus"/>Backend<span class="is-tooltip">Load initial state from the backend</span></button></li>
										<li class="is-column"><button class="is-button is-color-primary-outline is-size-xsmall has-tooltip" @click="addApplicationState"><icon name="plus"/></span>Application<span class="is-tooltip">Use state available at the application level</span></button></li>
										<li class="is-column"><button class="is-button is-color-primary-outline is-size-xsmall has-tooltip" @click="function() { if (page.content.stateErrors) page.content.stateErrors.push({}); else $window.Vue.set(page.content, 'stateErrors', [{}]) }"><icon name="plus"/>Error<span class="is-tooltip">In case of state errors when loading, where should the user be routed?</span></button></li>
									</ul>
								</div>
								<div class="is-accordion is-highlight-left">
									<n-collapsible :only-one-open="true" :title="state.name ? state.name : 'unnamed'" v-for="state in page.content.states" :after="state.inherited ? 'Application' : 'Backend'" class="is-color-primary-light" content-class="is-spacing-medium">
										<div slot="buttons" class="is-row is-spacing-horizontal-right-small">
											<button class="is-button is-variant-danger-outline is-size-xsmall" @click="page.content.states.splice(page.content.states.indexOf(state), 1)"><icon name="times"/></button>
										</div>
										<n-form-text :value="state.name" @input="function(newValue) { if (!validateStateName(newValue).length) state.name = newValue; }" label="Name" :required="true" :validator="validateStateName" :timeout="600"/>
										<div v-if="state.inherited">
											<n-form-combo v-model="state.applicationName" :filter="$services.page.getApplicationStateNames" label="Application State" />
										</div>
										<div v-else class="is-column is-spacing-gap-medium">
											<n-form-combo :value="state.operation" :filter="getStateOperations" label="Operation" @input="function(newValue) { setStateOperation(state, newValue) }"/>
											<n-page-mapper v-if="state.operation && Object.keys($services.page.getPageParameters(page)).length" :to="getOperationParameters(state.operation)"
												:from="$services.page.getPageStartupParameters(page)" 
												v-model="state.bindings"/>
											<n-form-switch v-model="state.enableParameterWatching" v-if="Object.keys(state.bindings).length > 0" label="Watch input bindings for change"/>
										</div>
										<n-form-ace mode="javascript" v-model="state.condition" label="Condition" info="If left empty it will always run. If filled in, it will only run if the condition returns true." :timeout="600"/>
										<page-triggerable-configure :page="page" :target="state" :triggers="{'initial': {}, 'update': {}}"/>
										<page-event-value :page="page" :container="state" title="Successful Update Event" name="updateEvent" @resetEvents="resetEvents" :inline="true" v-if="state.updateEvent && state.updateEvent.name" after="This is deprecated and should be replaced with triggers"/>
										<div class="is-column is-spacing-gap-medium" v-if="state.refreshOn && state.refreshOn.length > 0">
											<h4 class="is-h4">Refresh Events</h4>
											<p class="is-p is-size-small is-color-light">You can refresh this state when a particular event occurs. This is deprecated and should be replaced with parameter watching.</p>
											<div class="list" v-if="state.refreshOn">
												<div v-for="i in Object.keys(state.refreshOn)" class="has-button-close">
													<n-form-combo v-model="state.refreshOn[i]" :filter="getAvailableEvents" placeholder="event"/>
													<button class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="state.refreshOn.splice(i, 1)"><icon name="times"/></button>
												</div>
											</div>
											<div class="is-row is-align-end">
												<button class="is-button is-variant-primary-outline is-size-xsmall" @click="state.refreshOn ? state.refreshOn.push('') : $window.Vue.set(state, 'refreshOn', [''])"><icon name="plus"/>Refresh Event</button>
											</div>
										</div>
									</n-collapsible>
								</div>
								<div v-if="page.content.stateErrors" class="is-accordion is-highlight-left">
									<n-collapsible :only-one-open="true" class="is-color-primary-light" :title="stateError.code ? stateError.code : 'no code'" v-for="stateError in page.content.stateErrors" after="Error" content-class="is-spacing-medium">
										<div slot="buttons" class="is-row is-spacing-horizontal-right-small">
											<button class="is-button is-variant-danger-outline is-size-xsmall" @click="page.content.stateErrors.splice(page.content.stateErrors.indexOf(stateError), 1)"><icon name="times"/></button>
										</div>
										<n-form-text v-model="stateError.code" label="Error Code" :timeout="600"/>
										<n-form-combo label="Error Page" :filter="$services.page.getRoutes" v-model="stateError.route"/>
									</n-collapsible>
								</div>
								<n-collapsible title="Computed" class="list" v-if="false">
									<div class="padded-content">
										<p class="is-p is-size-small is-color-light">You can compute new values based on existing state. This is especially interesting if the calculation is non trivial and you don't want to embed it into the page.</p>
										<div class="is-row is-align-end">
											<button class="is-button is-variant-primary-outline is-size-xsmall" @click="addComputed"><icon name="plus"/>Computed State</button>
										</div>
									</div>
									<div v-if="page.content.computed" class="is-accordion is-highlight-left">
										<n-collapsible class="is-color-primary-light" :title="state.name ? state.name : 'unnamed'" v-for="state in page.content.computed" content-class="is-spacing-medium">
											<n-form-text :timeout="600" :value="state.name" @input="function(newValue) { if (!validateStateName(newValue).length) state.name = newValue; }" label="Name" :required="true" :validator="validateStateName"/>
											<n-page-mapper v-if="false && state.name" :to="[state.name]"
												:from="availableParameters" 
												v-model="state.bindings"/>
											<n-form-ace mode="javascript" v-model="state.script"/>
											<div class="list" v-if="state.refreshOn">
												<div v-for="i in Object.keys(state.refreshOn)" class="has-button-close">
													<n-form-combo v-model="state.refreshOn[i]" :filter="getAvailableEvents" placeholder="event"/>
													<button class="is-button is-variant-close is-size-small is-spacing-horizontal-right-large" @click="state.refreshOn.splice(i, 1)"><icon name="times"/></button>
												</div>
											</div>
											<div class="is-row is-align-end">
												<button class="is-button is-variant-primary-outline is-size-xsmall" @click="state.refreshOn ? state.refreshOn.push('') : $window.Vue.set(state, 'refreshOn', [''])"><icon name="plus"/>Refresh Event</button>
											</div>
										</n-collapsible>
									</div>
								</n-collapsible>	
							</template>
							<template v-if="$services.page.activeSubTab == 'styling'">
								<h2 class="section-title">Page Style</h2>
								<div class="is-column is-spacing-medium">	
									<n-form-combo label="Page Type" :filter="getPageTypes" v-model="page.content.pageType" info = "The page type determines how the page is rendered. For example an email requires different rendering from a webpage."/>
									<n-form-text v-model="page.content.class" label="CSS Class" info = "The main css class for this page" :timeout="600"/>
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="page.content.styles == null ? $window.Vue.set(page.content, 'styles', [{class:null,condition:null}]) : page.content.styles.push({class:null,condition:null})"><icon name="plus"/>Page style</button>
									</div>
									
									<div v-if="page.content.styles" class="is-column is-spacing-vertical-gap-medium">
										<n-form v-for="style in page.content.styles" class="has-button-close is-spacing-medium is-color-body">
											<n-form-section class="is-column is-spacing-vertical-small">
												<n-form-text v-model="style.class" label="CSS Class" :timeout="600" class="is-size-small"/>
												<n-form-text v-model="style.condition" label="Condition" :timeout="600" class="is-size-small"/>
												<button @click="page.content.styles.splice(page.content.styles.indexOf(style), 1)" class="is-button is-variant-close is-size-small"><icon name="times"/></button>
											</n-form-section>
										</n-form>
									</div>
								</div>
								<h2 class="section-title">Body Style</h2>
								<aris-editor 
									:key="'cell_' + page.name + '_aris_editing'"
									v-if="$services.page.useAris && $services.page.normalizeAris(page, page.content, 'page', getPageArisComponents())" :child-components="getPageArisComponents()" :container="page.content.aris"
									/>
								<div class="is-column is-spacing-medium">	
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="page.content.bodyStyles == null ? $window.Vue.set(page.content, 'bodyStyles', [{class:null,condition:null}]) : page.content.bodyStyles.push({class:null,condition:null})"><icon name="plus"/>Body style</button>
									</div>
									
									<div v-if="page.content.bodyStyles" class="is-column is-spacing-vertical-gap-medium">
										<n-form v-for="style in page.content.bodyStyles" class="has-button-close is-spacing-medium is-color-body">
											<n-form-section class="is-column is-spacing-vertical-small">
												<n-form-text v-model="style.class" label="CSS Class" class="is-size-small"/>
												<n-form-text v-model="style.condition" label="Condition" class="is-size-small"/>
												<button @click="page.content.bodyStyles.splice(page.content.bodyStyles.indexOf(style), 1)" class="is-button is-variant-close is-size-small"><icon name="times"/></button>
											</n-form-section>
										</n-form>
									</div>
								</div>
							</template>
							<template v-if="$services.page.activeSubTab == 'triggers'">
								<h2 class="section-title">Triggers</h2>
								<page-triggerable-configure :page="page" :target="page.content" :triggers="getEvents()" />
								<h2 class="section-title">Analysis</h2>
								<div class="is-row is-align-end is-spacing-medium">
									<button class="is-button is-variant-primary-outline is-size-xsmall" @click="addAnalysis"><icon name="plus"/>Analysis</button>
								</div>
								<n-collapsible :only-one-open="true" class="is-color-primary-light" :title="(analysis.chainEvent && analysis.chainEvent.name ? analysis.chainEvent.name : 'unnamed')" :after="analysis.on ? 'on ' + analysis.on : 'no trigger yet'" v-for="analysis in page.content.analysis" content-class="is-spacing-medium">
									<div slot="buttons" class="is-row is-spacing-horizontal-right-small">
										<button class="is-button is-size-xsmall is-variant-danger-outline" @click="page.content.analysis.splice(page.content.analysis.indexOf(analysis), 1)"><icon name="times"/></button>
									</div>
									<n-form-combo v-model="analysis.on" label="Trigger On" :filter="getAvailableEvents"/>
									<n-form-text v-model="analysis.condition" label="Condition" v-if="analysis.on" :timeout="600"/>
									<page-event-value :inline="true" class="no-more-padding" :page="page" :container="analysis" title="Analysis Event" name="chainEvent" @resetEvents="resetEvents"/>
								</n-collapsible>
								
								<h2 class="section-title">Publish global events</h2>
								<div class="is-column is-spacing-medium">	
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="addGlobalEvent"><icon name="plus"/>Global Event</button>
									</div>
									<div class="is-column is-spacing-vertical-gap-medium" v-if="page.content.globalEvents">
										<n-form-section class="is-column is-color-body has-button-close is-spacing-medium" v-for="i in Object.keys(page.content.globalEvents)">
											<n-form-combo v-model="page.content.globalEvents[i].localName"
												label="Local Name"
												:filter="getAvailableEvents"/>
											<n-form-text v-model="page.content.globalEvents[i].globalName" 
												label="Global Name"
												:placeholder="page.content.globalEvents[i].localName"/>
											<button class="is-button is-variant-close" @click="page.content.globalEvents.splice(i, 1)"><icon name="times"/></button>
										</n-form-section>
									</div>
								</div>
								<h2 class="section-title">Subscribe global events</h2>
								<div class="is-column is-spacing-medium">	
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="addGlobalEventSubscription"><icon name="plus"/>Global Event</button>
									</div>
									<div class="is-column is-spacing-vertical-gap-medium" v-if="page.content.globalEventSubscriptions">
										<n-form-section class="is-column is-color-body has-button-close is-spacing-medium" v-for="i in Object.keys(page.content.globalEventSubscriptions)">
											<n-form-combo v-model="page.content.globalEventSubscriptions[i].globalName"
												label="Global Name"
												:items="$window.Object.keys($services.page.getGlobalEvents())"/>
											<n-form-text v-model="page.content.globalEventSubscriptions[i].localName" 
												label="Local Name"
												:placeholder="page.content.globalEventSubscriptions[i].globalName"/>
											<button class="is-button is-variant-close" @click="page.content.globalEventSubscriptions.splice(i, 1)"><icon name="times"/></button>
										</n-form-section>
									</div>
								</div>
							</template>
						</n-form>
					</div>
					
					<page-components-overview v-else-if="activeTab == 'components'"/>
					
					<div v-else-if="activeTab == 'selected' && cell && selectedType == 'cell'" :key="'page_' + pageInstanceId + '_cell_' + cell.id + '_configuration'">
						<div class="tabbed-menu is-row is-spacing-xsmall is-spacing-vertical-bottom-none">
							<button @click="$services.page.activeSubTab = 'container'" class="is-button is-size-xsmall has-tooltip" :class="{'is-active': $services.page.activeSubTab == 'container'}">Cell<span class="is-tooltip is-position-bottom">Show cell details <shortkey alt="true">1</shortkey></span></button>
							<button @click="$services.page.activeSubTab = 'styling'" class="is-button is-size-xsmall has-tooltip" :class="{'is-active': $services.page.activeSubTab == 'styling'}">Styling<span class="is-tooltip is-position-bottom">Configure styling <shortkey alt="true">2</shortkey></span></button>
							<button @click="$services.page.activeSubTab = 'triggers'" class="is-button is-size-xsmall has-tooltip" :class="{'is-active': $services.page.activeSubTab == 'triggers'}">Triggers<span class="is-tooltip is-position-bottom">React to triggers <shortkey alt="true">3</shortkey></span></button>
							<button @click="$services.page.activeSubTab = 'component'" v-if="cell && $services.page.availableSubTabs.length == 0 && canConfigureInline(cell)" class="is-button is-size-xsmall has-tooltip" :class="{'is-active': $services.page.activeSubTab == 'component'}">{{cell.alias && false ? $services.page.prettifyRouteAlias(cell.alias) : "Main"}}<span class="is-tooltip is-position-bottom">General configuration <shortkey alt="true">4</shortkey></span></button>
							<button @click="$services.page.activeSubTab = customSubTab" v-for="(customSubTab, index) in $services.page.availableSubTabs" class="is-button is-size-xsmall has-tooltip" :class="{'is-active': $services.page.activeSubTab == customSubTab}">{{customSubTab == 'component' ? (cell.alias && false ? $services.page.prettifyRouteAlias(cell.alias) : "Main") : $services.page.prettify(customSubTab)}}<span class="is-tooltip is-position-bottom">Configure <shortkey alt="true">{{index + 4}}</shortkey></span></button>
							<button @click="$services.page.activeSubTab = 'analysis'" class="is-button is-size-xsmall has-tooltip" :class="{'is-active': $services.page.activeSubTab == 'analysis'}">Analysis<span class="is-tooltip is-position-bottom">Show cell details <shortkey alt="true">{{4 + $services.page.availableSubTabs.length}}</shortkey></span></button>
						</div>
						<n-form class="is-variant-floating-labels" key="cell-form">
							<template v-if="$services.page.activeSubTab == 'container'">
								<h2 class="section-title">General</h2>
								<div class="is-column is-spacing-medium"> 
									<n-form-text label="Name" v-model="cell.name" placeholder="A descriptive name for this cell" :timeout="600" :suffix="cell.id"/>
									<n-form-text label="Cell Id" v-model="cell.customId" placeholder="Add targetable container with id to this cell" :timeout="600"/>
								</div>
								
								<h2 class="section-title">Content</h2>
								<div class="is-column is-spacing-medium"> 
									<p class="section-description">A cell can contain either a renderer or content. A renderer is used to layout child content.</p>
									<n-form-combo label="Content" :filter="$services.page.getEmbeddableRoutes" v-model="cell.alias"
										v-if="!cell.renderer"
										:key="'page_' + pageInstanceId + '_' + cell.id + '_alias'"
										@input="$services.page.normalizeAris(page, cell)"/>
									<n-form-combo label="Renderer" v-if="!cell.alias" v-model="cell.renderer" :items="$services.page.getRenderers('cell')" 
										empty-value="No renderers found"
										:formatter="function(x) { return x.title ? x.title : x.name }"
										:extracter="function(x) { return x.name }" info="Use a specific renderer for this cell"/>
									<n-page-mapper v-if="cell.alias && $window.Object.keys(getRouteParameters(cell).properties).length" 
										:key="'page_' + pageInstanceId + '_' + cell.id + '_mapper'"
										:to="getRouteParameters(cell)"
										:from="getAvailableParameters(cell)" 
										v-model="cell.bindings"/>
									<n-form-text v-model="cell.contentRuntimeAlias" v-if="cell.alias && $window.Object.keys(getRouteParameters(cell).properties).length" label="Content Runtime Alias"/>
									<n-form-switch v-if="cell.alias" label="Stop Rerender" v-model="cell.stopRerender" info="All components are reactive to their input, you can however prevent rerendering by settings this to true"/>
									
									<div v-if="cell.renderer && $services.page.getRendererState(cell.renderer, cell, page, $services.page.getAllAvailableParameters(page))" class="is-column is-spacing-vertical-gap-medium">
										<n-form-text v-model="cell.runtimeAlias" label="Runtime alias for renderer state" :timeout="600"/>
										<n-form-switch v-model="cell.retainState" label="Retain state once cell is destroyed" v-if="cell.runtimeAlias"/>
										<n-form-switch v-model="cell.mergeState" label="Merge existing state when the rendered is created" v-if="cell.runtimeAlias"/>
									</div>
									<div v-if="cell.renderer && $services.page.getRendererConfiguration(cell.renderer)">
										<component :is="$services.page.getRendererConfiguration(cell.renderer)" :target="cell" :page="page"/>
									</div>
									<renderer-bindings :target="cell" :page="page" v-if="cell.renderer"/>
								</div>
								
								<template v-if="getParentConfig(cell) || getSlots(cell)">
									<h2 class="section-title">Parent</h2>
									<div class="is-column is-spacing-medium">
										<p class="section-description">Configuration options from the parent of this cell.</p>
										<n-form-combo label="Target slot in renderer" v-if="getSlots(cell)" v-model="cell.rendererSlot" :items="getSlots(cell)"/>
										
										<component v-if="getParentConfig(cell)" :is="getParentConfig(cell)"
											:cell="cell"
											:row="row"
											:page="page"/>
									</div>
								</template>
								
								<h2 class="section-title">Conditions</h2>
								<div class="is-column is-spacing-medium">
									<p class="section-description" v-if="!$services.page.isCloseable(cell) && !cell.condition">By default the cell will be visible.</p>
									<p class="section-description" v-else>By default the cell will be hidden.</p>
									<n-form-combo label="Hide this cell" 
										:items="[{name:'event', title:'Until an event occurs'}, {name: 'script', title: 'Until a condition is met'}, {name:'toggle', title: 'Until explicitly toggled'}, {name: 'device', title: 'On certain devices'}]"
										:extracter="function(x) { return x.name }"
										:formatter="function(x) { return x.title }"
										:value="getHideMode(cell)"
										@input="function(value) { setHideMode(cell, value) }"/>
										
									<n-form-switch v-if="$services.page.isCloseable(cell)" label="Cascade close" v-model="cell.cascadeClose"/>
										
									<n-form-combo label="The event that has to occur" v-model="cell.on" :filter="getAvailableEvents" v-if="cell.state.hideMode == 'event'" />

									<n-form-text type="number" v-model="cell.showTimeout" v-if="cell.state.hideMode == 'event'" label="Hide automatically after this amount of ms"/>
										
									<n-form-switch label="Start visible" v-model="cell.startVisible" v-if="cell.state.hideMode == 'toggle'" />
									
									<n-form-switch label="Hide until toggled explicitly" v-model="cell.closeable" v-if="false && !cell.on && (cell.target == 'page' || cell.target == null)" />
									
									<n-form-switch label="Autoclose once visible" v-model="cell.autocloseable" v-if="cell.closeable" after="Once it is toggled to visible and the user clicks outside this cell, do you want to automatically hide it again?"/>
									
									<n-form-ace mode="javascript" label="Condition" v-model="cell.condition" :timeout="600" v-if="cell.state.hideMode == 'script'"/>
									
									<div v-if="$services.page.devices.length && cell.state.hideMode == 'device'" class="is-column is-spacing-vertical-gap-medium">
										<p class="is-p is-size-small is-color-light is-spacing-vertical-bottom-small">Render the cell only if these device rules are met.</p>
										<div class="is-row is-align-end">
											<button class="is-button is-variant-primary-outline is-size-xsmall" @click="addDevice(cell)"><icon name="plus"/>Device rule</button>
										</div>
										<div v-if="cell.devices" class="is-column is-spacing-vertical-gap-medium">
											<div class="has-button-close is-column is-spacing-medium is-color-body" v-for="device in cell.devices">
												<p class="is-p is-size-small">Only render cell if device:</p>
												<n-form-combo v-model="device.operator" :items="['>', '>=', '<', '<=', '==']"/>
												<n-form-combo v-model="device.name" 
													:filter="suggestDevices"/>
												<button class="is-button is-variant-close" @click="cell.devices.splice(cell.devices.indexOf(device), 1)"><icon name="times"/></button>
											</div>
										</div>
									</div>
									<n-form-text label="Show only if user has permission" v-model="cell.permission" placeholder="E.g. company.list"/>
									<n-form-text :label="cell.permission ? 'Optional permission context' : 'Show only if user has any permission in context'" v-model="cell.permissionContext" placeholder="E.g. crm" />
									<n-form-text :label="cell.permission ? 'Optional permission service context' : 'Show only if user has any permission in service context'" v-model="cell.permissionServiceContext" placeholder="E.g. default" />
									<n-form-switch label="Permission inversion" v-model="cell.permissionInversion" info="Invert permission check"/>
								</div>
								
								<h2 class="section-title">Location</h2>
								<div class="is-column is-spacing-medium">
									<p class="section-description">By default a cell will render in the page, there are other options however.</p>
									<n-form-combo label="Render in" :items="['page', 'sidebar', 'prompt', 'absolute', 'pane']" v-model="cell.target" />
									<n-form-switch v-if="cell.target == 'absolute'" v-model="cell.targetInEdit" label="Show absolute positioning in edit mode as well"/>
									<n-form-switch label="Prevent Auto Close" v-model="cell.preventAutoClose" v-if="cell.target == 'sidebar'"
										after="The sidebar will automatically close when the user clicks elsewhere unless this is toggled"/>
									<n-form-switch label="Optimize (may result in stale content)" v-model="cell.optimizeVueKey" v-if="cell.on"/>
									<n-form-text label="Top" v-model="cell.top" v-if="cell.target == 'absolute'"/>
									<n-form-text label="Bottom" v-model="cell.bottom" v-if="cell.target == 'absolute'"/>
									<n-form-text label="Left" v-model="cell.left" v-if="cell.target == 'absolute'"/>
									<n-form-text label="Right" v-model="cell.right" v-if="cell.target == 'absolute'"/>
									<n-form-text label="Minimum Width" v-model="cell.minWidth" v-if="cell.target == 'absolute'"/>
									<n-form-switch label="Position fixed?" v-model="cell.fixed" v-if="cell.target == 'absolute'"/>
									<n-form-switch label="Autoclose" v-model="cell.autoclose" v-if="cell.target == 'absolute' || cell.target == 'prompt'"/>
									<n-form-combo label="Snap Point" v-model="cell.snapPoint" v-if="cell.target == 'absolute'" :items="['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']" placeholder="top-left"/>
								</div>
								
								<h2 class="section-title">Templating</h2>
								<div class="is-column is-spacing-medium">
									<template-manager :target="cell" :page="page"/>
								</div>
								
								<h2 class="section-title">States</h2>
								<div class="is-column is-spacing-medium">
									<p class="is-p is-size-small is-color-light is-spacing-vertical-bottom-small">Set dynamic states on the cell</p>
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="addTargetState(cell)"><icon name="plus"/>State</button>
									</div>
									<div v-if="cell.states" class="is-column is-spacing-vertical-gap-medium">
										<div class="has-button-close is-column is-spacing-medium is-color-body" v-for="(state, index) in cell.states">
											<n-form-text v-model="state.name" label="Name"/>
											<n-form-ace v-model="state.condition" label="Condition"/>
											<button class="is-button is-variant-close" @click="cell.states.splice(index, 1)"><icon name="times"/></button>
										</div>
									</div>
								</div>
							</template>
							<template v-if="$services.page.activeSubTab == 'component' || $services.page.availableSubTabs.indexOf($services.page.activeSubTab) >= 0">
								<component :is="getCellConfigurator(cell)" v-bind="getCellConfiguratorInput(cell)" v-if="canConfigureInline(cell)"/>
								<div v-else class="is-column is-spacing-medium">This cell has no additional configuration</div>
							</template>
							<template v-if="$services.page.activeSubTab == 'styling'">
								<h2 class="section-title">Aris</h2>
								<aris-editor 
										:key="'cell_' + cell.id + '_aris_editing'"
										v-if="$services.page.useAris && $services.page.normalizeAris(page, cell)" :child-components="$services.page.getCellComponents(page, cell)" :container="cell.aris"
										:specific="cell.alias"/>
										
								<h2 class="section-title">Other</h2>
								<div class="is-column is-spacing-medium" v-if="cell.class || (cell.styles && cell.styles.length)">
									<n-form-text label="Cell Class" v-model="cell.class" :timeout="600"/>
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="cell.styles == null ? $window.Vue.set(cell, 'styles', [{class:null,condition:null}]) : cell.styles.push({class:null,condition:null})"><icon name="plus"/>Cell Style</button>
									</div>
									<div class="is-column is-spacing-vertical-gap-medium" v-if="cell.styles">
										<n-form-section class="is-column is-color-body is-spacing-medium has-button-close" v-for="style in cell.styles">
											<n-form-text v-model="style.class" label="Class"/>
											<n-form-text v-model="style.condition" label="Condition" class="vertical"/>
											<button class="is-button is-variant-close" @click="cell.styles.splice(cell.styles.indexOf(style), 1)"><icon name="times"/></button>
										</n-form-section>
									</div>
								</div>
								
								<div class="is-column is-spacing-medium">
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="cell.styleVariables == null ? $window.Vue.set(cell, 'styleVariables', [{name:null,rule:null,condition:null}]) : cell.styleVariables.push({name:null,rule:null,condition:null})"><icon name="plus"/>Style Variable</button>
									</div>
									<div class="is-column is-spacing-vertical-gap-medium" v-if="cell.styleVariables">
										<n-form-section class="is-column is-color-body is-spacing-medium has-button-close" v-for="style in cell.styleVariables">
											<n-form-text v-model="style.name" label="Variable"/>
											<n-form-text v-model="style.rule" label="Value" class="vertical"/>
											<n-form-text v-model="style.condition" label="Condition" class="vertical"/>
											<button class="is-button is-variant-close" @click="cell.styleVariables.splice(cell.styleVariables.indexOf(style), 1)"><icon name="times"/></button>
										</n-form-section>
									</div>
								</div>
								
							</template>
							<template v-else-if="$services.page.activeSubTab == 'triggers'">
								<h2 class="section-title">Triggers</h2>
								<div class="is-column is-spacing-medium">
									<p class="section-description">You can add triggers to react to user interaction with the content.</p>
									<n-form-switch v-model="cell.state.stopClickPropagation" label="Stop click propagation"/>
									<n-form-switch v-model="cell.state.stopHoverPropagation" label="Stop hover propagation"/>
								</div>
								<page-triggerable-configure :page="page" :target="cell" :triggers="getTriggersForCell(cell)" :allow-closing="true"/>
							</template>
							<template v-else-if="$services.page.activeSubTab == 'analysis'">
								<h2 class="section-title">Analysis</h2>
								<n-form-text v-model="cell.analysisId" label="Analysis id"/>
							</template>
						</n-form>
					</div>
					
					<div v-else-if="activeTab == 'selected' && row && selectedType == 'row'" :key="'page_' + pageInstanceId + '_row_' + row.id + '_configuration'">
						<div class="tabbed-menu is-row is-spacing-xsmall is-spacing-vertical-bottom-none">
							<button @click="$services.page.activeSubTab = 'container'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'container'}">Row</button>
							<button @click="$services.page.activeSubTab = 'styling'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'styling'}">Styling</button>
							<button @click="$services.page.activeSubTab = 'triggers'" class="is-button is-size-xsmall" :class="{'is-active': $services.page.activeSubTab == 'triggers'}">Triggers</button>
						</div>
						<n-form class="is-variant-floating-labels" key="cell-form">
							<template v-if="$services.page.activeSubTab == 'container'">
								<h2 class="section-title">General</h2>
								<div class="is-column is-spacing-medium">
									<n-form-text label="Name" v-model="row.name" placeholder="A descriptive name for this row" :timeout="600" :suffix="row.id"/>
									<n-form-text label="Row Id" v-model="row.customId" placeholder="Add an id to this row, useful for skeletons"/>
								</div>
								<h2 class="section-title">Content</h2>
								<div class="is-column is-spacing-medium">
									<n-form-combo label="Renderer" v-model="row.renderer" :items="$services.page.getRenderers('row')"  :formatter="function(x) { return x.title ? x.title : x.name }" :extracter="function(x) { return x.name }"/>
									
									<div v-if="row.renderer && $services.page.getRendererState(row.renderer, row, page, $services.page.getAllAvailableParameters(page))" class="is-column is-spacing-vertical-gap-medium">
										<n-form-text v-model="row.runtimeAlias" label="Runtime alias for renderer state" :timeout="600"/>
										<n-form-switch v-model="row.retainState" label="Retain state once row is destroyed" v-if="row.runtimeAlias"/>
										<n-form-switch v-model="row.mergeState" label="Merge existing state when the rendered is created" v-if="row.runtimeAlias"/>
									</div>
									<div v-if="row.renderer && $services.page.getRendererConfiguration(row.renderer)">
										<component :is="$services.page.getRendererConfiguration(row.renderer)" :target="row" :page="page"/>
									</div>
									
									<renderer-bindings :target="row" :page="page" v-if="row.renderer"/>	
								</div>
								<template v-if="getParentConfig(row) || getSlots(row)">
									<h2 class="section-title">Parent</h2>
									<div class="is-column is-spacing-medium">
										<p class="section-description">Configuration options from the parent of this row.</p>
										<n-form-combo label="Target slot in renderer" v-if="getSlots(row)" v-model="row.rendererSlot" :items="getSlots(row)"/>
										
										<component v-if="getParentConfig(row)" :is="getParentConfig(row)"
											:row="row"
											:page="page"/>
									</div>
								</template>
								<h2 class="section-title">Conditions</h2>
								<div class="is-column is-spacing-medium">
									<p class="is-p is-size-small" v-if="!$services.page.isCloseable(row) && !row.condition">By default the row will be visible.</p>
									<p class="is-p is-size-small" v-else>By default the row will be hidden.</p>
									
									<n-form-combo label="Hide this row" 
										:items="[{name:'event', title:'Until an event occurs'}, {name: 'script', title: 'Until a condition is met'}, {name:'toggle', title: 'Until explicitly toggled'}, {name: 'device', title: 'On certain devices'}]"
										:extracter="function(x) { return x.name }"
										:formatter="function(x) { return x.title }"
										:value="getHideMode(row)"
										@input="function(value) { setHideMode(row, value) }"/>
										
										
									<n-form-switch v-if="$services.page.isCloseable(row)" label="Cascade close" v-model="row.cascadeClose"/>
									
									<n-form-combo label="The event that has to occur" v-model="row.on" :filter="getAvailableEvents" v-if="row.state.hideMode == 'event'"/>
									
									<n-form-switch label="Start visible" v-model="row.startVisible" v-if="row.state.hideMode == 'toggle'" />
									
									<n-form-switch label="Hide by default" v-model="row.closeable"
										v-if="false"/>
										
									<n-form-switch label="Autoclose once visible" v-model="row.autocloseable" v-if="row.closeable" after="Once it is toggled to visible and the user clicks outside this row, do you want to automatically hide it again?"/>
									
									<n-form-ace mode="javascript" label="Condition" v-model="row.condition" v-if="row.state.hideMode == 'script'" class="vertical"/>
									
									<div v-if="$services.page.devices.length && row.state.hideMode == 'device'" class="is-column is-spacing-vertical-medium">
										<p class="is-p is-size-small is-color-light is-spacing-vertical-bottom-small">Render the row only if these device rules are met.</p>
										<div class="is-row is-align-end">
											<button class="is-button is-variant-primary-outline is-size-xsmall" @click="addDevice(row)"><icon name="plus"/>Device rule</button>
										</div>
										<div v-if="row.devices" class="is-column is-spacing-vertical-gap-medium">
											<div class="is-column is-spacing-medium is-color-body has-button-close" v-for="device in row.devices">
												<p class="is-p is-size-small">Only render row if device:</p>
												<n-form-combo v-model="device.operator" :items="['>', '>=', '<', '<=', '==']"/>
												<n-form-combo v-model="device.name" 
													:filter="suggestDevices"/>
												<button class="is-button is-variant-close" @click="row.devices.splice(row.devices.indexOf(device), 1)"><icon name="times"/></button>
											</div>
										</div>
									</div>
									<n-form-text label="Show only if user has permission" v-model="row.permission" placeholder="E.g. company.list"/>
									<n-form-text :label="row.permission ? 'Optional permission context' : 'Show only if user has any permission in context'" v-model="row.permissionContext" placeholder="E.g. crm" />
									<n-form-text :label="row.permission ? 'Optional permission service context' : 'Show only if user has any permission in service context'" v-model="row.permissionServiceContext" placeholder="E.g. default" />
								</div>
								<h2 class="section-title">Templating</h2>
								<div class="is-column is-spacing-medium">
									<template-manager :target="row" :page="page"/>
								</div>
							</template>
							<template v-if="$services.page.activeSubTab == 'styling'">
								<h2 class="section-title">Row styling</h2>
								<aris-editor v-if="$services.page.useAris && $services.page.normalizeAris(page, row, 'row')" :child-components="$services.page.getRowComponents(page, row)" :container="row.aris"/>
								<div class="is-column is-spacing-medium" v-if="row.class && (row.styles || row.styles.length)">
									<n-form-text label="Class" v-model="row.class" :timeout="600"/>
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="row.styles == null ? $window.Vue.set(row, 'styles', [{class:null,condition:null}]) : row.styles.push({class:null,condition:null})"><icon name="plus"/>Row Style</button>
									</div>
									<div class="is-column is-spacing-vertical-gap-medium" v-if="row.styles">
										<n-form-section class="is-column is-color-body is-spacing-medium has-button-close" v-for="style in row.styles">
											<n-form-text v-model="style.class" label="Class"/>
											<n-form-text v-model="style.condition" label="Condition" class="vertical"/>
											<button class="is-button is-variant-close" @click="row.styles.splice(row.styles.indexOf(style), 1)"><icon name="times"/></button>
										</n-form-section>
									</div>
								</div>
								<div class="is-column is-spacing-medium">
									<div class="is-row is-align-end">
										<button class="is-button is-variant-primary-outline is-size-xsmall" @click="row.styleVariables == null ? $window.Vue.set(row, 'styleVariables', [{name:null,rule:null,condition:null}]) : row.styleVariables.push({name:null,rule:null,condition:null})"><icon name="plus"/>Style Variable</button>
									</div>
									<div class="is-column is-spacing-vertical-gap-medium" v-if="row.styleVariables">
										<n-form-section class="is-column is-color-body is-spacing-medium has-button-close" v-for="style in row.styleVariables">
											<n-form-text v-model="style.name" label="Variable"/>
											<n-form-text v-model="style.rule" label="Value" class="vertical"/>
											<n-form-text v-model="style.condition" label="Condition" class="vertical"/>
											<button class="is-button is-variant-close" @click="row.styleVariables.splice(row.styleVariables.indexOf(style), 1)"><icon name="times"/></button>
										</n-form-section>
									</div>
								</div>
							</template>
							<template v-if="$services.page.activeSubTab == 'triggers'">
								<h2 class="section-title">Triggers</h2>
								<div class="is-column is-spacing-medium">
									<p class="section-description">You can add triggers to react to user interaction with the content.</p>
									<n-form-switch v-model="row.state.stopClickPropagation" label="Stop click propagation"/>
									<n-form-switch v-model="row.state.stopHoverPropagation" label="Stop hover propagation"/>
								</div>
								<page-triggerable-configure :page="page" :target="row" :triggers="getTriggersForCell(row)" :allow-closing="row.target && row.target != 'page'"/>
							</template>
						</n-form>
					</div>
				</div>
				</div>
		</n-sidebar>
		
		<template v-if="page.content.rows">
			<n-page-row 
				:active-views="activeViews"
				@update="updateEvent"
				v-for="row in page.content.rows"
				:row="row"
				:page="page" 
				:edit="edit"
				:depth="0"
				:parameters="parameters"
				:ref="page.name + '_rows'"
				:root="true"
				:page-instance-id="pageInstanceId"
				:stop-rerender="stopRerender"
				@select="selectItem"
				@viewComponents="viewComponents = edit"
				:slot="row.rendererSlot"
				@removeRow="function(x) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { page.content.rows.splice(page.content.rows.indexOf(x), 1) }) }"/>
		</template>
		
		<div class="page-menu n-page-menu" v-if="edit && false">
			<button @click="viewComponents = !viewComponents"><span class="fa fa-cubes" title="Add Components"></span></button>
		</div>
	</component>
</template>

<template id="page-row">
	<component :is="rowTagFor(row)" :id="row.customId && !row.renderer ? row.customId : page.name + '_' + row.id" 
			:draggable="isDraggable(row)"
			@update="updateEvent"
			:class="$window.nabu.utils.arrays.merge(['page-row-' + row.cells.length, row.class ? row.class : null, {'collapsed': row.collapsed}, {'empty': edit && (!row.cells || !row.cells.length) } ], rowClasses(row))"  
			:key="'page_' + pageInstanceId + '_row_' + row.id"
			:row-key="'page_' + pageInstanceId + '_row_' + row.id"
			v-if="edit || shouldRenderRow(row)"
			:style="rowStyles(row)"
			@drop="drop($event, row)" 
			@dragend="$services.page.clearDrag($event)"
			@dragover="dragOver($event, row)"
			@dragexit="dragExit($event, row)"
			@mouseout="mouseOut($event, row)"
			@mouseout.native="mouseOut($event, row)"
			@mouseover="mouseOver($event, row)"
			@mouseover.native="mouseOver($event, row)"
			@click.ctrl="goto($event, row)"
			@click.meta="goto($event, row)"
			@click.alt="$emit('select', row, null, 'row')"
			@click="clickOnRow(row, $event)"
			@click.native="clickOnRow(row, $event)"
			@contextmenu.ctrl="goto($event, row, null, 'layout')"
			@contextmenu.prevent.ctrl.native="goto($event, row, null, 'layout')"
			@click.alt.prevent.native="pasteArisStyling($event, row)"
			@contextmenu.prevent.alt.native="copyArisStyling($event, row)"
			:href="targetHref(row)"
			:placeholder="row.name ? row.name : null"
			:target="row"
			:edit="edit"
			:page="page"
			@close="close(row)"
			:child-components="$services.page.calculateArisComponents(row.aris, row.renderer, $self)"
			:parameters="getRendererParameters(row)"
			:anchor="row.customId && !row.renderer ? row.customId : null"
			class="page-row"
			v-auto-close="$services.page.isCloseable(row) && row.autocloseable ? function() { autocloseCell(row) } : null"
			>
		<div class="is-row-menu is-layout is-align-main-center is-align-cross-bottom is-spacing-vertical-xsmall" v-if="edit && false" @mouseenter="menuHover" @mouseleave="menuUnhover">
			<button class="is-button is-variant-primary is-size-xsmall has-tooltip is-wrap-none" v-if="!row.collapsed" @click="goto($event, row)"><icon name="cog"/><span class="is-text">{{row.renderer ? row.renderer : 'Row'}}</span></button>
		</div>
		
		<div class="is-row-content" v-if="row.customId && row.renderer" :id="row.customId" :anchor="row.customId"></div>
		
		<template v-for="cell in row.cells">
			<template v-if="edit">
				<component :is="cellTagFor(row, cell)" :style="getStyles(cell)" 
						:draggable="isDraggable(cell)"
						v-if="cell.target != 'absolute' || !cell.targetInEdit"
						@update="updateEvent"
						v-show="!edit || !row.collapsed"
						:id="cell.customId && !cell.alias ? cell.customId : page.name + '_' + row.id + '_' + cell.id"  
						:class="$window.nabu.utils.arrays.merge([{'clickable': hasCellClickEvent(cell)}, cell.class ? $services.page.interpret(cell.class, $self) : null, {'has-page': hasPageRoute(cell), 'is-root': root}, {'empty': edit && !cell.alias && (!cell.rows || !cell.rows.length) } ], cellClasses(cell))" 
						:key="cellId(cell) + '_edit' + '_' + cell.alias"
						:cell-id="cell.id"
						@click="clickOnCell(row, cell, $event)"
						@click.ctrl="goto($event, row, cell)"
						@click.meta="goto($event, row, cell)"
						@click.alt.prevent="pasteArisStyling($event, cell)"
						@contextmenu.prevent.alt="copyArisStyling($event, cell)"
						@click.native="clickOnCell(row, cell, $event)"
						@click.ctrl.native="goto($event, row, cell)"
						@click.meta.native="goto($event, row, cell)"
						@click.alt.prevent.native="pasteArisStyling($event, cell)"
						@contextmenu.prevent.alt.native="copyArisStyling($event, cell)"
						@contextmenu.ctrl="goto($event, row, cell, 'layout')"
						@contextmenu.prevent.ctrl.native="goto($event, row, cell, 'layout')"
						@mouseout="mouseOut($event, row, cell)"
						@mouseout.native="mouseOut($event, row, cell)"
						@mouseover="mouseOver($event, row, cell)"
						@mouseover.native="mouseOver($event, row, cell)"
						@dragend="$services.page.clearDrag($event)"
						@dragover="dragOverCell($event, row, cell)"
						@dragexit="dragExitCell($event, row, cell)"
						@drop="dropCell($event, row, cell)"
						:href="targetHref(cell)"
						:target="cell"
						:edit="edit"
						:page="page"
						:placeholder="cell.name ? cell.name : (cell.alias ? $services.page.prettifyRouteAlias(cell.alias) : null)"
						:child-components="$services.page.calculateArisComponents(cell.aris, cell.renderer, $self)"
						:parameters="getRendererParameters(cell)"
						v-route-render.embedded="{ alias: !cell.rows.length && !cell.renderer ? cell.alias : null, parameters: getParameters(row, cell), mounted: getMountedFor(cell, row), rerender: function() { var rerender = cell.aris && cell.aris.rerender; if (cell.aris) cell.aris.rerender = false; return rerender; }, created: getCreatedComponent(row, cell) }"
						:anchor="cell.customId ? cell.customId : null"
						:slot="cell.rendererSlot"
						class="page-column"
						>
					
					<div class="is-column-content" v-if="cell.alias && (cell.renderer || cell.rows.length)" :key="'page_' + pageInstanceId + '_edit_' + cell.id" v-route-render.embedded="{ alias: cell.alias, parameters: getParameters(row, cell), mounted: getMountedFor(cell, row), rerender: function() { var rerender = cell.aris && cell.aris.rerender; if (cell.aris) cell.aris.rerender = false; return rerender; }, created: getCreatedComponent(row, cell) }"></div>
					
					<n-page-row v-for="row in cell.rows"
						:active-views="activeViews"
						locked="true"
						:row="row"
						:page="page" 
						:edit="edit"
						:depth="depth + 1"
						:parameters="parameters"
						:ref="page.name + '_' + cell.id + '_rows'"
						:local-state="getLocalState(row, cell)"
						:page-instance-id="pageInstanceId"
						:stop-rerender="stopRerender"
						v-bubble:viewComponents
						v-bubble:select
						@update="updateEvent"
						:slot="row.rendererSlot"
						@removeRow="function(row) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { cell.rows.splice(cell.rows.indexOf(row), 1) }) }"/>
					
					<div locked="true" class="is-column-menu is-layout is-align-main-center is-spacing-vertical-xsmall" @mouseenter="menuHover" @mouseleave="menuUnhover" v-if="true">
						<div v-if="isNoActiveView()">
							<button v-if="cell.alias" class="is-button is-variant-secondary is-size-xsmall has-tooltip is-wrap-none" @click="goto($event, row, cell)"><icon name="cog"/><span class="is-text">{{ cell.alias ? $services.page.prettifyRouteAlias(cell.alias) : "Cell" }}</span></button>
							<button v-else class="is-button is-variant-secondary is-size-xsmall has-tooltip is-wrap-none" @click="goto($event, row, cell)"><icon name="magic"/><span class="is-text">{{ cell.alias ? $services.page.prettifyRouteAlias(cell.alias) : "Cell" }}</span></button>
							<span class="is-badge is-color-danger" v-if="cell.condition">On condition</span>
							<span class="is-badge is-color-warning" v-if="cell.on">On event</span>
							<span class="is-badge is-color-neutral" v-if="cell.state.hideMode == 'toggle'">On toggle</span>
						</div>
						<div v-else-if="isActiveView('conditions')">
							<span class="is-badge is-color-danger" v-if="cell.condition">{{cell.condition}}</span>
							<span class="is-badge is-color-warning" v-if="cell.on">{{cell.on}}</span>
							<span class="is-badge is-color-neutral" v-if="cell.state.hideMode == 'toggle'">On toggle</span>
						</div>
						<div v-else-if="isActiveView('styling')">
							<div v-for="component in $services.page.getCellComponents(page, cell)" v-if="$services.aris.listActive(cell.aris, component).length">
								<span class="is-badge is-color-secondary">{{component.name}}</span><span v-for="option in $services.aris.listActive(cell.aris, component)" class="is-badge is-color-neutral"><span class="is-content is-variant-subscript">{{option.dimension}}</span><b>{{option.name}}</b><span v-if="option.condition" class="is-content is-color-danger-outline"> {{option.condition}}</span></span>
							</div>
						</div>
					</div>
				</component>
				
				<n-absolute :fixed="cell.fixed" :style="{'min-width': cell.minWidth}" :autoclose="cell.autoclose" v-else-if="cell.target == 'absolute'" @close="close(row, cell)" :top="cell.top" :bottom="cell.bottom" :left="cell.left" :right="cell.right" :snap-point="cell.snapPoint">          
					<component :is="cellTagFor(row, cell)" :style="getStyles(cell)" 
							:draggable="isDraggable(cell)"
							@update="updateEvent"
							v-show="!edit || !row.collapsed"
							:id="cell.customId && !cell.alias ? cell.customId : page.name + '_' + row.id + '_' + cell.id"  
							:class="$window.nabu.utils.arrays.merge([{'clickable': hasCellClickEvent(cell)}, cell.class ? $services.page.interpret(cell.class, $self) : null, {'has-page': hasPageRoute(cell), 'is-root': root}, {'empty': edit && !cell.alias && (!cell.rows || !cell.rows.length) } ], cellClasses(cell))" 
							:key="cellId(cell)"
							:cell-id="cell.id"
							@close="close(row, cell)"
							@click="clickOnCell(row, cell, $event)"
							@click.ctrl="goto($event, row, cell)"
							@click.meta="goto($event, row, cell)"
							@click.alt.prevent="pasteArisStyling($event, cell)"
							@contextmenu.prevent.alt="copyArisStyling($event, cell)"
							@click.native="clickOnCell(row, cell, $event)"
							@click.ctrl.native="goto($event, row, cell)"
							@click.meta.native="goto($event, row, cell)"
							@click.alt.prevent.native="pasteArisStyling($event, cell)"
							@contextmenu.prevent.alt.native="copyArisStyling($event, cell)"
							@contextmenu.prevent.ctrl="goto($event, row, cell, 'layout')"
							@contextmenu.prevent.ctrl.native="goto($event, row, cell, 'layout')"
							@mouseout="mouseOut($event, row, cell)"
							@mouseout.native="mouseOut($event, row, cell)"
							@mouseover="mouseOver($event, row, cell)"
							@mouseover.native="mouseOver($event, row, cell)"
							@dragend="$services.page.clearDrag($event)"
							@dragover="dragOverCell($event, row, cell)"
							@dragexit="dragExitCell($event, row, cell)"
							@drop="dropCell($event, row, cell)"
							:href="targetHref(cell)"
							:target="cell"
							:edit="edit"
							:page="page"
							:child-components="$services.page.calculateArisComponents(cell.aris, cell.renderer, $self)"
							:parameters="getRendererParameters(cell)"
							:anchor="cell.customId ? cell.customId : null"
							v-route-render.embedded="{ alias: !cell.rows.length && !cell.renderer ? cell.alias : null, parameters: !cell.rows.length ? getParameters(row, cell) : {}, mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"
							:slot="cell.rendererSlot"
							>
						
						<div class="is-column-content" v-if="cell.alias && (cell.renderer || cell.rows.length)" @keyup.esc="close(cell)" :key="'page_' + pageInstanceId + '_rendered_' + cell.id" v-route-render.embedded="{ alias: cell.alias, parameters: getParameters(row, cell), mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"></div>
						<n-page-row v-for="childRow in cell.rows"
							:row="childRow"
							:page="page" 
							:edit="edit"
							:depth="depth + 1"
							:parameters="parameters"
							:ref="page.name + '_' + cell.id + '_rows'"
							:local-state="getLocalState(childRow, cell)"
							:page-instance-id="pageInstanceId"
							:stop-rerender="stopRerender"
							v-bubble:viewComponents
							v-bubble:select
							@update="updateEvent"
							@close="close(row, cell, childRow)"
							:slot="childRow.rendererSlot"
							@removeRow="function(row) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { cell.rows.splice(cell.rows.indexOf(row), 1) }) }"/>
							
						<div locked="true" class="is-column-menu is-layout is-align-main-center is-spacing-vertical-xsmall" @mouseenter="menuHover" @mouseleave="menuUnhover" v-if="true">
							<div v-if="isNoActiveView()">
								<button v-if="cell.alias" class="is-button is-variant-secondary is-size-xsmall has-tooltip is-wrap-none" @click="goto($event, row, cell)"><icon name="cog"/><span class="is-text">{{ cell.alias ? $services.page.prettifyRouteAlias(cell.alias) : "Cell" }}</span></button>
								<button v-else class="is-button is-variant-secondary is-size-xsmall has-tooltip is-wrap-none" @click="goto($event, row, cell)"><icon name="magic"/><span class="is-text">{{ cell.alias ? $services.page.prettifyRouteAlias(cell.alias) : "Cell" }}</span></button>
								<span class="is-badge is-color-danger" v-if="cell.condition">On condition</span>
								<span class="is-badge is-color-warning" v-if="cell.on">On event</span>
								<span class="is-badge is-color-neutral" v-if="cell.state.hideMode == 'toggle'">On toggle</span>
							</div>
							<div v-else-if="isActiveView('conditions')">
								<span class="is-badge is-color-danger" v-if="cell.condition">{{cell.condition}}</span>
								<span class="is-badge is-color-warning" v-if="cell.on">{{cell.on}}</span>
								<span class="is-badge is-color-neutral" v-if="cell.state.hideMode == 'toggle'">On toggle</span>
							</div>
							<div v-else-if="isActiveView('styling')">
								<div v-for="component in $services.page.getCellComponents(page, cell)" v-if="$services.aris.listActive(cell.aris, component).length">
									<span class="is-badge is-color-secondary">{{component.name}}</span><span v-for="option in $services.aris.listActive(cell.aris, component)" class="is-badge is-color-neutral"><span class="is-content is-variant-subscript">{{option.dimension}}</span><b>{{option.name}}</b><span v-if="option.condition" class="is-content is-color-danger-outline"> {{option.condition}}</span></span>
								</div>
							</div>
						</div>
					</component>
				</n-absolute>
			</template>
			<template v-else-if="shouldRenderCell(row, cell)">
				<n-sidebar v-if="cell.target == 'sidebar'" @close="close(row, cell)" :popout="false" :autocloseable="!cell.preventAutoClose" class="content-sidebar" :style="getSideBarStyles(cell)">
					<component :is="cellTagFor(row, cell)" :style="getStyles(cell)" 
							:draggable="isDraggable(cell)"
							@update="updateEvent"
							v-show="!edit || !row.collapsed"
							:id="cell.customId && !cell.alias ? cell.customId : page.name + '_' + row.id + '_' + cell.id"  
							:class="$window.nabu.utils.arrays.merge([{'clickable': hasCellClickEvent(cell)}, cell.class ? $services.page.interpret(cell.class, $self) : null, {'has-page': hasPageRoute(cell), 'is-root': root}, {'empty': edit && !cell.alias && (!cell.rows || !cell.rows.length) } ], cellClasses(cell))" 
							:key="cellId(cell)"
							:cell-id="cell.id"
							@close="close(row, cell)"
							@click="clickOnCell(row, cell, $event)"
							@mouseover.native="mouseOver($event, row, cell)"
							@mouseout.native="mouseOut($event, row, cell)"
							@click.native="clickOnCell(row, cell, $event)"
							@click.ctrl="goto($event, row, cell)"
							@click.meta="goto($event, row, cell)"
							@mouseout="mouseOut($event, row, cell)"
							@mouseover="mouseOver($event, row, cell)"
							@dragend="$services.page.clearDrag($event)"
							@dragover="dragOverCell($event, row, cell)"
							@dragexit="dragExitCell($event, row, cell)"
							@drop="dropCell($event, row, cell)"
							:href="targetHref(cell)"
							:target="cell"
							:edit="edit"
							:page="page"
							:child-components="$services.page.calculateArisComponents(cell.aris, cell.renderer, $self)"
							:parameters="getRendererParameters(cell)"
							:anchor="cell.customId ? cell.customId : null"
							v-route-render.embedded="{ alias: !cell.rows.length && !cell.renderer ? cell.alias : null, parameters: !cell.rows.length ? getParameters(row, cell) : {}, mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"
							:slot="cell.rendererSlot"
							>

						<div class="is-column-content" v-if="cell.alias && (cell.renderer || cell.rows.length)" @keyup.esc="close(cell)" :key="'page_' + pageInstanceId + '_rendered_' + cell.id" v-route-render.embedded="{ alias: cell.alias, parameters: getParameters(row, cell), mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"></div>
						
						<n-page-row v-for="childRow in cell.rows"
							:row="childRow"
							:page="page" 
							:edit="edit"
							:depth="depth + 1"
							:parameters="parameters"
							:ref="page.name + '_' + cell.id + '_rows'"
							:local-state="getLocalState(childRow, cell)"
							:page-instance-id="pageInstanceId"
							:stop-rerender="stopRerender"
							v-bubble:viewComponents
							v-bubble:select
							@update="updateEvent"
							@close="close(row, cell, childRow)"
							:slot="childRow.rendererSlot"
							@removeRow="function(row) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { cell.rows.splice(cell.rows.indexOf(row), 1) }) }"/>
					</component>
				</n-sidebar>
				<n-prompt v-else-if="cell.target == 'prompt'" @close="close(row, cell)" :autoclose="cell.autoclose">
					<component :is="cellTagFor(row, cell)" :style="getStyles(cell)" 
							:draggable="isDraggable(cell)"
							@update="updateEvent"
							v-show="!edit || !row.collapsed"
							:id="cell.customId && !cell.alias ? cell.customId : page.name + '_' + row.id + '_' + cell.id"  
							:class="$window.nabu.utils.arrays.merge([{'clickable': hasCellClickEvent(cell)}, cell.class ? $services.page.interpret(cell.class, $self) : null, {'has-page': hasPageRoute(cell), 'is-root': root}, {'empty': edit && !cell.alias && (!cell.rows || !cell.rows.length) } ], cellClasses(cell))" 
							:key="cellId(cell)"
							:cell-id="cell.id"
							@close="close(row, cell)"
							@click="clickOnCell(row, cell, $event)"
							@mouseover.native="mouseOver($event, row, cell)"
							@mouseout.native="mouseOut($event, row, cell)"
							@click.native="clickOnCell(row, cell, $event)"
							@click.ctrl="goto($event, row, cell)"
							@click.meta="goto($event, row, cell)"
							@mouseout="mouseOut($event, row, cell)"
							@mouseover="mouseOver($event, row, cell)"
							@dragend="$services.page.clearDrag($event)"
							@dragover="dragOverCell($event, row, cell)"
							@dragexit="dragExitCell($event, row, cell)"
							@drop="dropCell($event, row, cell)"
							:href="targetHref(cell)"
							:target="cell"
							:edit="edit"
							:page="page"
							:child-components="$services.page.calculateArisComponents(cell.aris, cell.renderer, $self)"
							:parameters="getRendererParameters(cell)"
							:anchor="cell.customId ? cell.customId : null"
							v-route-render.embedded="{ alias: !cell.rows.length && !cell.renderer ? cell.alias : null, parameters: !cell.rows.length ? getParameters(row, cell) : {}, mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"
							:slot="cell.rendererSlot"
							>
						
						<div class="is-column-content" v-if="cell.alias && (cell.renderer || cell.rows.length)" @keyup.esc="close(cell)" :key="'page_' + pageInstanceId + '_rendered_' + cell.id" v-route-render.embedded="{ alias: cell.alias, parameters: getParameters(row, cell), mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"></div>
						<n-page-row v-for="childRow in cell.rows"
							:row="childRow"
							:page="page" 
							:edit="edit"
							:depth="depth + 1"
							:parameters="parameters"
							:ref="page.name + '_' + cell.id + '_rows'"
							:local-state="getLocalState(childRow, cell)"
							:page-instance-id="pageInstanceId"
							:stop-rerender="stopRerender"
							v-bubble:viewComponents
							v-bubble:select
							@update="updateEvent"
							@close="close(row, cell, childRow)"
							:slot="childRow.rendererSlot"
							@removeRow="function(row) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { cell.rows.splice(cell.rows.indexOf(row), 1) }) }"/>
					</component>
				</n-prompt>
				<n-absolute :fixed="cell.fixed" :style="{'min-width': cell.minWidth}" :autoclose="cell.autocloseable" v-else-if="cell.target == 'absolute'" @close="close(row, cell)" :top="cell.top" :bottom="cell.bottom" :left="cell.left" :right="cell.right" :snap-point="cell.snapPoint">          
					<component :is="cellTagFor(row, cell)" :style="getStyles(cell)" 
							:draggable="isDraggable(cell)"
							@update="updateEvent"
							v-show="!edit || !row.collapsed"
							:id="cell.customId && !cell.alias ? cell.customId : page.name + '_' + row.id + '_' + cell.id"  
							:class="$window.nabu.utils.arrays.merge([{'clickable': hasCellClickEvent(cell)}, cell.class ? $services.page.interpret(cell.class, $self) : null, {'has-page': hasPageRoute(cell), 'is-root': root}, {'empty': edit && !cell.alias && (!cell.rows || !cell.rows.length) } ], cellClasses(cell))" 
							:key="cellId(cell)"
							:cell-id="cell.id"
							@close="close(row, cell)"
							@click="clickOnCell(row, cell, $event)"
							@mouseover.native="mouseOver($event, row, cell)"
							@mouseout.native="mouseOut($event, row, cell)"
							@click.native="clickOnCell(row, cell, $event)"
							@click.ctrl="goto($event, row, cell)"
							@click.meta="goto($event, row, cell)"
							@mouseout="mouseOut($event, row, cell)"
							@mouseover="mouseOver($event, row, cell)"
							@dragend="$services.page.clearDrag($event)"
							@dragover="dragOverCell($event, row, cell)"
							@dragexit="dragExitCell($event, row, cell)"
							@drop="dropCell($event, row, cell)"
							:href="targetHref(cell)"
							:target="cell"
							:edit="edit"
							:page="page"
							:child-components="$services.page.calculateArisComponents(cell.aris, cell.renderer, $self)"
							:parameters="getRendererParameters(cell)"
							:anchor="cell.customId ? cell.customId : null"
							v-route-render.embedded="{ alias: !cell.rows.length && !cell.renderer ? cell.alias : null, parameters: !cell.rows.length ? getParameters(row, cell) : {}, mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"
							:slot="cell.rendererSlot"
							>
						
						<div class="is-column-content" v-if="cell.alias && (cell.renderer || cell.rows.length)" @keyup.esc="close(cell)" :key="'page_' + pageInstanceId + '_rendered_' + cell.id" v-route-render.embedded="{ alias: cell.alias, parameters: getParameters(row, cell), mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"></div>
						<n-page-row v-for="childRow in cell.rows"
							:row="childRow"
							:page="page" 
							:edit="edit"
							:depth="depth + 1"
							:parameters="parameters"
							:ref="page.name + '_' + cell.id + '_rows'"
							:local-state="getLocalState(childRow, cell)"
							:page-instance-id="pageInstanceId"
							:stop-rerender="stopRerender"
							v-bubble:viewComponents
							v-bubble:select
							@update="updateEvent"
							@close="close(row, cell, childRow)"
							:slot="childRow.rendererSlot"
							@removeRow="function(row) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { cell.rows.splice(cell.rows.indexOf(row), 1) }) }"/>
					</component>
				</n-absolute>
				<template v-else>
					<component :is="cellTagFor(row, cell)" :style="getStyles(cell)" 
							:draggable="isDraggable(cell)"
							@update="updateEvent"
							v-show="!isContentHidden(cell)"
							:id="cell.customId && !cell.alias ? cell.customId : page.name + '_' + row.id + '_' + cell.id"  
							:class="$window.nabu.utils.arrays.merge([{'clickable': hasCellClickEvent(cell)}, cell.class ? $services.page.interpret(cell.class, $self) : null, {'has-page': hasPageRoute(cell), 'is-root': root}, {'empty': edit && !cell.alias && (!cell.rows || !cell.rows.length) } ], cellClasses(cell))" 
							:key="cellId(cell)"
							:cell-id="cell.id"
							@close="close(row, cell)"
							@click="clickOnCell(row, cell, $event)"
							@mouseover.native="mouseOver($event, row, cell)"
							@mouseout.native="mouseOut($event, row, cell)"
							@click.native="clickOnCell(row, cell, $event)"
							@click.ctrl="goto($event, row, cell)"
							@click.meta="goto($event, row, cell)"
							@mouseout="mouseOut($event, row, cell)"
							@mouseover="mouseOver($event, row, cell)"
							@dragend="$services.page.clearDrag($event)"
							@dragover="dragOverCell($event, row, cell)"
							@dragexit="dragExitCell($event, row, cell)"
							@drop="dropCell($event, row, cell)"
							:href="targetHref(cell)"
							v-auto-close="$services.page.isCloseable(cell) && cell.autocloseable ? function() { autocloseCell(null, cell) } : null"
							:target="cell"
							:edit="edit"
							:page="page"
							:child-components="$services.page.calculateArisComponents(cell.aris, cell.renderer, $self)"
							:parameters="getRendererParameters(cell)"
							:anchor="cell.customId ? cell.customId : null"
							v-route-render.embedded="{ alias: !cell.rows.length && !cell.renderer ? cell.alias : null, parameters: !cell.rows.length ? getParameters(row, cell) : {}, mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"
							:slot="cell.rendererSlot"
							>
						
						<div class="is-column-content" v-if="cell.alias && (cell.renderer || cell.rows.length)" @click="clickOnContentCell(row, cell)" @keyup.esc="close(cell)" :key="'page_' + pageInstanceId + '_rendered_' + cell.id" v-route-render.embedded="{ alias: cell.alias, parameters: getParameters(row, cell), mounted: getMountedFor(cell, row), rerender: function() { return !stopRerender && !cell.stopRerender }, created: getCreatedComponent(row, cell) }"></div>
						<n-page-row v-for="childRow in cell.rows"
							:row="childRow"
							:page="page" 
							:edit="edit"
							:depth="depth + 1"
							:parameters="parameters"
							:ref="page.name + '_' + cell.id + '_rows'"
							:local-state="getLocalState(childRow, cell)"
							:page-instance-id="pageInstanceId"
							:stop-rerender="stopRerender"
							v-bubble:viewComponents
							v-bubble:select
							@update="updateEvent"
							@close="close(row, cell, childRow)"
							:slot="childRow.rendererSlot"
							@removeRow="function(row) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { cell.rows.splice(cell.rows.indexOf(row), 1) }) }"/>
					</component>
				</template>
			</template>
		</template>
	</component>
</template>


<template id="page-rows">
	<component :is="rowsTag()" class="is-grid">
		<n-page-row v-for="row in rows" :row="row" :page="page" :edit="edit" :parameters="parameters" :root="root" :stop-rerender="stopRerender" :depth="depth" @update="updateEvent"/>
	</component>
</template>

<template id="n-prompt">
	<div class="is-modal">
		<div class="is-modal-content" v-auto-close="function() { if (autoclose) $emit('close') }">
			<slot></slot>
		</div>
	</div>
</template>

<template id="n-absolute">
	<div class="n-absolute" :style="getStyles()" v-auto-close="function() { if (autoclose) $emit('close') }">
		<div class="n-absolute-content">
			<slot></slot>
		</div>
	</div>
</template>

<template id="aris-editor">
	<div class="aris-editor">
		<div class="is-column is-spacing-medium">
			<n-form-text v-model="search" :timeout="600" placeholder="Search styling options"/>
			<n-form-switch v-if="$services.page.theme" label="Restrict to theme" v-model="$services.page.restrictToTheme"/>
		</div>
		<n-collapsible v-for="childComponent in childComponents" :only-one-open="true" class="is-highlight-left is-color-primary-lighter" :title="childComponent.title" :after="childComponent.component + getFormattedAmountOfAppliedOptions(childComponent)" ref="collapsibles">
			<ul class="is-menu is-variant-toolbar is-align-end is-spacing-horizontal-right-small" slot="buttons">
				<li class="is-column"><button class="is-button is-variant-primary-outline is-size-xsmall has-tooltip" @click="saveAsDefaultAris(childComponent)"><icon name="save"/><span class="is-tooltip is-position-left">Save as default</span></button></li>
				<li class="is-column"><button class="is-button is-variant-primary-outline is-size-xsmall has-tooltip" @click="clearOptions(childComponent)"><icon name="undo"/><span class="is-tooltip is-position-left">Clear settings</span></button></li>
			</ul>
			<div class="is-column is-spacing-medium">
				<n-form-combo v-model="container.components[childComponent.name].variant" label="Variant" :filter="getAvailableVariantNames.bind($self, childComponent)" after="Choose the main variant of this component"
					:placeholder="childComponent.defaultVariant ? childComponent.defaultVariant : childComponent.name"
					empty-value="No variants available"
					@input="container.components[childComponent.name].modifiers.splice(0)"/>
			</div>
			<n-collapsible v-if="getAvailableModifierNames(childComponent).length > 0" title="modifier" class="is-highlight-left is-color-secondary-lighter" 
					content-class="is-spacing-medium is-spacing-vertical-gap-xsmall is-color-background"
					:after="listActiveModifiers(childComponent)"
					@show="conditioning = null">
				<div class="is-row" v-for="(modifier, index) in getAvailableModifierNames(childComponent)">
					<n-form-checkbox v-if="conditioning != modifier" :value="isActiveModifier(childComponent, modifier)" :label="modifier"
						@input="function() { toggleModifier(childComponent, modifier) }"
						class="is-spacing-vertical-none"/>
					<n-form-text v-model="container.components[childComponent.name].conditions[modifier]" v-else class="is-size-small is-border-underline" placeholder="Condition"/>
					<div class="is-row is-position-right is-align-cross-end" v-if="isActiveModifier(childComponent, modifier)">
						<ul v-if="conditioning == modifier" class="is-menu is-variant-toolbar">
							<li class="is-column"><button class="is-button is-size-xsmall is-variant-primary-outline" @click="conditioning = null">Save</button></li>
							<li class="is-column"><button class="is-button is-size-xsmall is-variant-danger-outline" @click="container.components[childComponent.name].conditions[modifier] = null; conditioning = null">Clear</button></li>
						</ul>
						<ul v-else class="is-menu is-variant-toolbar">
							<li class="is-column"><button class="is-button is-size-xsmall is-variant-primary-outline" @click="conditioning = modifier">Set Condition</button></li>
							<li class="is-column" v-if="hasCondition(childComponent, modifier)"><button class="is-button is-size-xsmall is-variant-danger-outline has-tooltip" @click="container.components[childComponent.name].conditions[modifier] = null">Clear Condition</button></li>
						</ul>
					</div>
				</div>
			</n-collapsible>
			<n-collapsible v-for="dimension in getAvailableDimensions(childComponent)" :only-one-open="true" :title="dimension.name" class="is-highlight-left is-color-secondary-lighter" 
					v-if="hasAnySearchHits(dimension)"
					content-class="is-spacing-medium is-spacing-vertical-gap-none is-color-background"
					:after="listActiveOptions(childComponent, dimension)"
					@show="conditioning = null">
				<ul class="is-menu is-variant-toolbar is-align-end is-spacing-horizontal-right-small" slot="buttons" v-show="listActiveOptions(childComponent, dimension)">
					<li class="is-column"><button class="is-button is-variant-secondary-outline is-size-xsmall has-tooltip" @click="clearDimension(childComponent, dimension.name)"><icon name="undo"/><span class="is-tooltip is-position-left">Clear dimension</span></button></li>
				</ul>
				<div class="is-row" v-for="option in dimension.options" v-if="hasAnySearchHits(dimension, option)">
					<n-form-checkbox v-if="conditioning != dimension.name + '_' + option.name" :value="isActiveOption(childComponent, dimension, option.name)" @input="function() { toggleOption(childComponent, dimension, option.name) }"
						:label="prettifyOption(option.name)" :info="formatBody(option.body)"/>
					<n-form-text v-model="container.components[childComponent.name].conditions[dimension.name + '_' + option.name]" v-else class="is-size-small is-border-underline" placeholder="Condition"/>
					<div class="is-row is-position-right is-align-cross-end" v-if="isActiveOption(childComponent, dimension, option.name)">
						<ul v-if="conditioning == dimension.name + '_' + option.name" class="is-menu is-variant-toolbar">
							<li class="is-column"><button class="is-button is-size-xsmall is-variant-primary-outline" @click="conditioning = null">Save</button></li>
							<li class="is-column"><button class="is-button is-size-xsmall is-variant-danger-outline" @click="container.components[childComponent.name].conditions[dimension.name + '_' + option.name] = null; conditioning = null">Clear</button></li>
						</ul>
						<ul v-else class="is-menu is-variant-toolbar">
							<li class="is-column"><button class="is-button is-size-xsmall is-variant-primary-outline" @click="conditioning = dimension.name + '_' + option.name">Set Condition</button></li>
							<li class="is-column" v-if="hasCondition(childComponent, dimension.name + '_' + option.name)"><button class="is-button is-size-xsmall is-variant-danger-outline has-tooltip" @click="container.components[childComponent.name].conditions[dimension.name + '_' + option.name] = null">Clear Condition</button></li>
						</ul>
					</div>
				</div>
			</n-collapsible>
		</n-collapsible>
	</div>
</template>
<template id="page-sidemenu">
	<div class="is-column is-pattern-basic-alternating">
		<div v-for="row in rows" class="is-column is-spacing-small is-spacing-horizontal-right-none is-spacing-vertical-gap-small" :class="{'is-selected': selected && selected.id == row.id}">
			<div class="is-row" :class="{'is-color-primary-outline':row.renderer}" :id="'layout-entry-' + row.id" :key="'layout-entry-' + row.id">
				<div @mouseout="mouseOut($event, row)"
						@dragover="acceptDragRow($event, row)"
						@dragend="$services.page.clearDrag($event)"
						@drop="dropRow($event, row)"
						@mouseover="mouseOver($event, row)" 
						@keydown.f2.prevent="function() { editing = null; aliasing = row.id; requestFocus() }"
						@keydown.delete.prevent="$emit('removeRow', row)"
						@keydown.c.ctrl.prevent="copyRow(row)"
						@keydown.c.meta.prevent="copyRow(row)"
						@keydown.v.ctrl.prevent="pasteCell(row)"
						@keydown.v.meta.prevent="pasteCell(row)"
						@keydown.up.ctrl.prevent="up(row)"
						@keydown.down.ctrl.prevent="down(row)"
						class="is-row is-fill-normal"
						tabindex="-10"
						@contextmenu="showMenu(row, null, $event)"
						>
					<button class="is-button is-variant-ghost is-size-xsmall" @click="toggleRow(row)"><icon :name="opened.indexOf(row.id) >= 0 ? 'chevron-down' : 'chevron-right'"/></button>
					<n-form-text v-if="aliasing == row.id" v-model="row.name" class="is-variant-inline is-size-xsmall" :placeholder="row.name ? row.name : ($services.page.getRenderer(row.renderer) ? $services.page.getRenderer(row.renderer).title : (row.class ? row.class : row.id))" :autofocus="true"
						:commit="true"
						@keydown.delete="function(e) { e.stopPropagation() }"
						@commit="function() { aliasing = null }"
						@keydown.escape="function() { aliasing = null }"/>
					<span class="is-content is-size-xsmall is-fill-normal is-position-cross-center" @click="selectRow(row)" 
						@dragstart="dragRow($event, row)"
						:draggable="true" 
						v-else
						@click.ctrl="scrollIntoView(row)">{{formatPageItem(row)}}</span>
						
					<div v-if="showMenuItem == row" class="contextmenu is-column" v-auto-close="closeMenu" :style="'left:' + offsetX + 'px;top:' + offsetY + 'px'">
						<button class="is-button is-variant-ghost is-size-small" @click="copyRow(row)" :auto-close="true"><icon name="copy"/><span class="is-text">Copy</span><shortkey :ctrl="true">C</shortkey></button>
						<button :disabled="!$services.page.copiedCell" class="is-button is-variant-ghost is-size-small" @click="pasteCell(row)" :auto-close="true"><icon name="paste"/><span class="is-text">Paste</span><shortkey :ctrl="true">V</shortkey></button>
						<button class="is-button is-variant-ghost is-size-small" @click="up(row)" :auto-close="true"><icon name="chevron-circle-up"/><span class="is-text">Up</span><shortkey :ctrl="true">UP</shortkey></button>
						<button class="is-button is-variant-ghost is-size-small" @click="down(row)" :auto-close="true"><icon name="chevron-circle-down"/><span class="is-text">Down</span><shortkey :ctrl="true">DOWN</shortkey></button>
						<button class="is-button is-variant-ghost is-size-small" @click="row.collapsed = !row.collapsed" :auto-close="true"><icon name="paste"/><span class="is-text">{{ row.collapsed ? "Show" : "Hide" }}</span></button>
						<button class="is-button is-variant-ghost is-size-small" @click="$emit('removeRow', row)" :auto-close="true"><icon name="times"/><span class="is-text">Delete</span><shortkey>DEL</shortkey></button>
						<button class="is-button is-variant-ghost is-size-small" @click="function() { editing = null; aliasing = row.id; requestFocus() }" :auto-close="true"><icon name="pencil-alt"/><span class="is-text">Rename</span><shortkey>F2</shortkey></button>
					</div>
				</div>
				<ul class="is-menu is-variant-toolbar is-position-right is-spacing-horizontal-right-small">
					<li class="is-column" v-if="$services.page.useAris"><button class="is-button is-variant-warning-outline is-size-xsmall has-tooltip" @click="rotate(row)"><icon name="undo"/><span class="is-tooltip is-position-bottom-reverse">Rotate row</span></button></li>
					<li class="is-column"><button class="is-button is-size-xsmall is-color-primary-outline has-tooltip" @click="addCell(row)"><icon name="plus"/><span class="is-tooltip is-position-bottom-reverse">Add cell</span></button></li>
					<li class="is-column" v-if="false"><button class="is-button is-variant-secondary-outline is-size-xsmall" @click="up(row)"><icon name="chevron-circle-up"/></button></li>
					<li class="is-column" v-if="false"><button class="is-button is-variant-secondary-outline is-size-xsmall" @click="down(row)"><icon name="chevron-circle-down"/></button></li>
					<li class="is-column" v-if="false"><button class="is-button is-size-xsmall is-color-primary-outline has-tooltip" @click="row.collapsed = !row.collapsed"><icon :name="row.collapsed ? 'eye-slash': 'eye'"/><span class="is-tooltip is-position-bottom">{{ row.collapsed ? "Show" : "Hide" }}</span></button></li>
					<li class="is-column" v-if="false"><button class="is-button is-size-xsmall is-color-primary-outline has-tooltip" @click="copyRow(row)"><icon name="copy"/><span class="is-tooltip is-position-left">Copy row</span></button></li>
					<li class="is-column" v-if="false"><button class="is-button is-variant-warning has-tooltip is-size-xsmall" v-if="$services.page.copiedCell" @click="pasteCell(row)"><icon name="paste"/><span class="is-tooltip is-position-left">Paste Cell</span></button></li>
					<li class="is-column" v-if="false"><button class="is-button is-size-xsmall is-color-danger-outline" @click="$emit('removeRow', row)"><icon name="times"/></button></li>
				</ul>
			</div>
			<div v-show="row.cells && row.cells.length && opened.indexOf(row.id) >= 0" class="is-column is-pattern-basic-alternating">
				<div v-for="cell in row.cells" class="is-column is-spacing-small is-sidemenu-cell is-spacing-horizontal-right-none" :class="{'is-selected': selected && selected.id == cell.id}">
					<div class="is-row" :class="{'is-color-primary-outline':cell.renderer}" :id="'layout-entry-' + cell.id">
						<div @mouseout="mouseOut($event, row, cell)" 
								:key="'sidemenu-' + row.id + '_' + cell.id"
								@dragend="$services.page.clearDrag($event)"
								@dragover="acceptDragCell($event, row, cell)"
								@drop="dropCell($event, row, cell)"
								@mouseover="mouseOver($event, row, cell)"
								class="is-row is-fill-normal is-spacing-horizontal-gap-small is-no-outline"
								@click.ctrl="scrollIntoView(row, cell)"
								@click="selectCell(row, cell)"
								@dragstart="dragCell($event, row, cell)"
								:draggable="true"
								@keydown.f2.prevent="function() { aliasing = null; editing = cell.id; requestFocus() }"
								@keydown.f3.prevent="function() { editing = null; aliasing = cell.id; requestFocus() }"
								@keydown.esc.prevent="function() { editing = null; aliasing = null }"
								@keydown.ctrl.up="left(row, cell)"
								@keydown.ctrl.down="right(row, cell)"
								@keydown.delete.prevent="removeCell(row.cells, cell)"
								@keydown.c.ctrl.prevent="copyCell(cell)"
								@keydown.c.meta.prevent="copyCell(cell)"
								@keydown.v.ctrl.prevent="pasteRow(cell)"
								@keydown.v.meta.prevent="pasteRow(cell)"
								@contextmenu="showMenu(row, cell, $event)"
								:ref="'cell_' + cell.id"
								tabindex="-10">
							<icon name="cube" class="is-size-xsmall is-position-cross-center" @click.native="function() { editing = null; aliasing = aliasing == cell.id ? null : cell.id }" v-if="false"/>
							<icon :name="getCellIcon(cell)" class="is-size-xsmall is-position-cross-center" />
							<n-form-text v-if="editing == cell.id" v-model="cell.name" class="is-variant-inline is-size-xsmall" :placeholder="cell.alias ? $services.page.prettifyRouteAlias(cell.alias) : cell.id" :autofocus="true"
								ref="editor"
								:commit="true"
								@keydown.delete="function(e) { e.stopPropagation() }"
								@commit="function() { editing = null; requestFocusCell(cell) }"
								@keydown.escape="function() { editing = null; requestFocusCell(cell) }"/>
							<n-form-combo v-if="aliasing == cell.id" class="is-variant-inline is-size-xsmall is-fill-normal is-spacing-horizontal-right-medium" :filter="$services.page.getNamedRoutes" v-model="cell.alias"
								ref="aliaser"
								:extracter="function(x) { return x.alias }"
								:formatter="function(x) { return $services.page.prettifyRouteAlias(x.alias) }"
								:key="'page_' + pageInstanceId + '_' + cell.id + '_alias'" 
								@keydown.escape="function() { aliasing = null; requestFocusCell(cell) }" 
								@input="$services.page.slowNormalizeAris(page, cell)"/>
							<span v-if="editing != cell.id && aliasing != cell.id" class="is-content is-size-xsmall is-position-cross-center" @click="selectCell(row, cell)" 
								>{{formatPageItem(cell)}}</span>
							<button class="is-button is-size-xxsmall is-variant-ghost is-position-cross-center" @click="function() { aliasing = null; editing = cell.id }" v-if="false && aliasing != cell.id && editing != cell.id"><icon name="pencil-alt"/></button>
						</div>
						<ul class="is-menu is-variant-toolbar is-position-right is-spacing-horizontal-right-small">
							<li class="is-column"><button class="is-button is-variant-warning-outline is-size-xsmall has-tooltip" @click="wrapCell(row, cell)"><icon name="chevron-circle-right"/><span class="is-tooltip is-position-bottom-reverse">Wrap cell</span></button></li>
							<li class="is-column"><button class="is-button is-color-primary-outline is-size-xsmall has-tooltip" @click="addRow(cell)" :disabled="cell.alias"><icon name="plus"/><span class="is-tooltip is-position-bottom-reverse">Add Row</span></button></li>
							<li v-if="false" class="is-column"><button class="is-button is-color-secondary-outline is-size-xsmall has-tooltip" @click="left(row, cell)" v-if="row.cells.length >= 2"><icon name="chevron-circle-up"/></button></li>
							<li v-if="false" class="is-column"><button class="is-button is-color-secondary-outline is-size-xsmall has-tooltip" @click="right(row, cell)" v-if="row.cells.length >= 2"><icon name="chevron-circle-down"/></button></li>
							<li v-if="false" class="is-column"><button class="is-button is-color-primary-outline is-size-xsmall has-tooltip" @click="copyCell(cell)"><icon name="copy"/><span class="is-tooltip">Copy Cell</span></button></li>
							<li v-if="false" class="is-column"><button class="is-button is-color-warning is-size-xsmall has-tooltip" @click="pasteRow(cell)" v-if="$services.page.copiedRow"><icon name="paste"/><span class="is-tooltip">Paste Row</span></button></li>
							<li v-if="false" class="is-column"><button class="is-button is-color-danger-outline is-size-xsmall" @click="removeCell(row.cells, cell)"><icon name="times"/></button></li>
						</ul>
						<div v-if="showMenuItem == cell" class="contextmenu is-column" v-auto-close="closeMenu" :style="'left:' + offsetX + 'px;top:' + offsetY + 'px'">
							<button class="is-button is-variant-ghost is-size-small" @click="copyCell(cell)" :auto-close="true"><icon name="copy"/><span class="is-text">Copy</span><shortkey :ctrl="true">C</shortkey></button>
							<button :disabled="!$services.page.copiedRow" class="is-button is-variant-ghost is-size-small" @click="pasteRow(cell)" :auto-close="true"><icon name="paste"/><span class="is-text">Paste</span><shortkey :ctrl="true">V</shortkey></button>
							<button class="is-button is-variant-ghost is-size-small" @click="left(row, cell)" :auto-close="true"><icon name="chevron-circle-up"/><span class="is-text">Up</span><shortkey :ctrl="true">UP</shortkey></button>
							<button class="is-button is-variant-ghost is-size-small" @click="right(row, cell)" :auto-close="true"><icon name="chevron-circle-down"/><span class="is-text">Down</span><shortkey :ctrl="true">DOWN</shortkey></button>
							<button class="is-button is-variant-ghost is-size-small" @click="removeCell(row.cells, cell)" :auto-close="true"><icon name="times"/><span class="is-text">Delete</span><shortkey>DEL</shortkey></button>
							<button class="is-button is-variant-ghost is-size-small" @click="function() { aliasing = null; editing = cell.id; requestFocus() }" :auto-close="true"><icon name="pencil-alt"/><span class="is-text">Rename</span><shortkey>F2</shortkey></button>
							<button class="is-button is-variant-ghost is-size-small" @click="function() { editing = null; aliasing = cell.id; requestFocus() }" :auto-close="true"><icon name="cubes"/><span class="is-text">Component</span><shortkey>F3</shortkey></button>
						
						</div>
					</div>
					<page-sidemenu v-show="cell.rows && cell.rows.length" :rows="cell.rows" :page="page" v-bubble:select :selected="selected"
						@open="function() { if (opened.indexOf(row) < 0) opened.push(row.id) }"
						v-bubble:open
						@removeRow="function(row) { $confirm({message:'Are you sure you want to remove this row?'}).then(function() { cell.rows.splice(cell.rows.indexOf(row), 1) }) }"/>
				</div>
			</div>
		</div>
	</div>
</template>

<template id="renderer-bindings">
	<n-collapsible :title="'Data Binding'" class="is-color-primary-light" content-class="is-spacing-medium">
		<n-page-mapper :to="fields"
			:from="$services.page.getAvailableParameters(page, null, true)"
			v-model="target.rendererBindings"/>
		<div class="is-row is-align-end" v-if="target.renderer == 'form'">
			<n-form-combo class="is-size-small" :filter="$services.page.getAllAvailableKeys.bind($self, page, true)" v-model="automapFrom"/>
			<button @click="automap" class="is-button is-variant-primary-outline is-size-xsmall"><icon name="link"/><span class="is-text">Automap</span></button>
		</div>
	</n-collapsible>
</template>

<template id="template-manager">
	<div>
		<div v-if="target.templateReferenceId">
			<p class="is-p is-spacing-horizontal-gap-small" v-if="target.templateVersion"><span class="is-text">This is an instance of template "{{target.templateTitle}}"</span><span class="is-badge is-variant-primary-outline is-size-xsmall">v{{target.templateVersion}}</span></p>
			<p class="is-p is-spacing-horizontal-gap-small" v-else><span class="is-text">This is part of a template instance</span><span class="is-badge is-variant-primary-outline is-size-xsmall" v-if="target.templateVersion">v{{target.templateVersion}}</span></p>
			<div v-if="target.templateVersion && latestAvailableVersion != null && target.templateVersion != latestAvailableVersion" class="is-column is-spacing-vertical-medium">
				<p class="is-p">A new version is available.</p>
				<div class="is-row is-align-end">
					<button class="is-button is-variant-primary-outline is-size-xsmall" @click="updateToLatest">Update to v{{latestAvailableVersion}}</button>
				</div>
			</div>
		</div>
		<div v-else-if="partOfTemplate">
			<p class="is-p" v-if="excluded">
				This is part of a template definition exclusion.
			</p>
			<div v-else class="is-column is-spacing-vertical-gap-medium">
				<p class="is-p">This is part of a template definition.</p>
				<n-form-switch label="Exclude from template" v-model="target.excludeFromTemplate" after="You can choose to not include this part into the template"/>
			</div>
		</div>
		<div v-else class="is-column is-spacing-vertical-medium">
			<n-form-switch label="Make template" v-model="target.isTemplate"/>
			<div v-if="target.isTemplate" class="is-column is-spacing-vertical-gap-medium">
				<n-form-text label="Template title" v-model="target.templateTitle" after="Keep the title short"/>
				<n-form-text label="Template category" v-model="target.templateCategory" after="The template category this belongs in"/>
				<n-form-text label="Template icon" v-model="target.templateIcon" />
				<n-form-text label="Template description" type="area" v-model="target.templateDescription"/>
				
				<p class="is-p">Current release: {{target.templateVersion ? target.templateVersion : "unreleased"}}</p>
				<div class="is-row is-align-end is-spacing-vertical-medium">
					<button class="is-button is-variant-primary-outline is-size-xsmall" @click="release">Create release</button>
				</div>
			</div>
		</div>
	</div>
</template>

