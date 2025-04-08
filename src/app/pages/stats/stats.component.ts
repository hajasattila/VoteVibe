import {AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {DatabaseService} from 'src/api/services/database-service/database.service';
import {
    ApexNonAxisChartSeries,
    ApexChart,
    ApexResponsive,
    ApexTitleSubtitle,
    ApexTheme
} from 'ng-apexcharts';
import {TranslateService} from '@ngx-translate/core';

export type ChartOptions = {
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    labels: string[];
    responsive: ApexResponsive[];
    title: ApexTitleSubtitle;
    theme?: ApexTheme;
};

@Component({
    selector: 'app-stats',
    templateUrl: './stats.component.html',
    styleUrls: ['./stats.component.css']
})
export class StatsComponent implements OnInit, AfterViewInit {

    @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;
    dropdownReady = false;

    public chartOptions!: ChartOptions;
    public chartType: ApexChart['type'] = 'pie';

    public labels: string[] = [];
    public series: ApexNonAxisChartSeries = [];

    constructor(
        private route: ActivatedRoute,
        private dbService: DatabaseService,
        private translate: TranslateService
    ) {
    }

    ngAfterViewInit() {
        this.dropdownReady = true;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (this.chartDropdownOpen && this.dropdownReady) {
            const clickedInside = this.dropdownWrapper.nativeElement.contains(event.target);
            if (!clickedInside) {
                this.chartDropdownOpen = false;
            }
        }
    }

    toggleChartDropdown() {
        this.chartDropdownOpen = !this.chartDropdownOpen;
    }

    ngOnInit(): void {
        const code = this.route.snapshot.paramMap.get('code');
        if (!code) return;

        this.dbService.getRoomByCode(code).subscribe(room => {
            if (!room?.pollResults || !room.poll?.options) return;

            const totalVotes: Record<string, number> = {};

            for (const userVotes of Object.values(room.pollResults)) {
                if (userVotes && typeof userVotes === 'object') {
                    for (const [option, count] of Object.entries(userVotes)) {
                        totalVotes[option] = (totalVotes[option] || 0) + (count as number);
                    }
                }
            }

            this.labels = room.poll.options;
            this.series = this.labels.map(option => totalVotes[option] || 0);
            this.updateChart();
        });
    }

    updateChart(): void {
        const translatedTitle = this.translate.instant('room.statsChart.chartTitle');

        const multiSeriesTypes = ['bar', 'line', 'area', 'radar', 'heatmap'];
        const isMultiSeries = multiSeriesTypes.includes(this.chartType);
        const finalSeries = isMultiSeries
            ? [{name: this.translate.instant('room.statsChart.seriesName'), data: this.series}]
            : this.series;

        const isDark = document.documentElement.classList.contains('dark');

        this.chartOptions = {
            series: finalSeries as any,
            chart: {
                type: this.chartType,
                height: 350
            },
            labels: this.labels,
            title: {
                text: translatedTitle
            },
            theme: {
                mode: isDark ? 'dark' : 'light'
            },
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 300
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            ]
        };
    }

    chartTypes: string[] = ['pie', 'donut', 'bar', 'line', 'radar', 'area', 'polarArea', 'radialBar'];
    selectedChartType: string = 'pie';
    chartDropdownOpen = false;

    selectChartType(type: string) {
        this.selectedChartType = type;
        this.chartType = type as ApexChart['type'];
        this.chartDropdownOpen = false;
        this.updateChart();
    }

    getChartIcon(type: string): string {
        switch (type) {
            case 'pie':
                return 'pie_chart';
            case 'donut':
                return 'donut_large';
            case 'bar':
                return 'bar_chart';
            case 'line':
                return 'show_chart';
            case 'radar':
                return 'track_changes';
            case 'area':
                return 'stacked_line_chart';
            case 'polarArea':
                return 'explore';
            case 'radialBar':
                return 'radio_button_checked';
            default:
                return 'insert_chart';
        }
    }
}
